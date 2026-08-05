/// <reference types="vite/client" />

import { deviceProof, devicePublicKey, signChallenge } from "./device";
import { AuthError } from "./types";
import type { AuthErrorCode, QuestUser } from "./types";

const configured: unknown = import.meta.env.VITE_QUEST_API_BASE;

export const apiBase =
  typeof configured === "string" && configured.length > 0
    ? configured.replace(/\/$/u, "")
    : "https://cmu.quest";

export const apiUrl = (path: string): string =>
  `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;

interface UserBody {
  sub: string;
  email: string | null;
  name: string;
  andrew_id: string;
  groups: string[];
  admin: boolean;
}

interface LogoutBody {
  end_session_url: string | null;
}

interface ErrorBody {
  error: string;
}

interface ChallengeBody {
  nonce: string;
}

interface TicketBody {
  ticket: string;
}

const KNOWN_CODES: readonly AuthErrorCode[] = [
  "auth_not_configured",
  "oidc_discovery_failed",
  "session_store_unavailable",
  "access_denied",
  "login_required",
  "idp_error",
  "sign_in_failed",
  "invalid_return",
  "expired_token",
  "unauthorized",
  "proof_required",
  "proof_invalid",
  "proof_replayed",
  "device_mismatch",
  "device_owned",
  "device_unverified",
  "nonce_invalid",
  "public_key_invalid",
];

/** The pre-session routes; mirrors `bootstrap` on the server. */
const UNPROOFED: readonly string[] = ["/auth/challenge", "/auth/device", "/auth/login"];

async function readJson<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

export function errorCode(raw: string | null | undefined): AuthErrorCode {
  return KNOWN_CODES.find((known) => known === raw) ?? "unknown";
}

export async function responseError(response: Response): Promise<AuthErrorCode> {
  return errorCode((await readJson<ErrorBody>(response))?.error);
}

export async function send(
  path: string,
  id: string | null,
  init: RequestInit = {},
): Promise<Response> {
  const url = apiUrl(path);
  const method = init.method ?? "GET";
  const headers = new Headers(init.headers);

  if (id !== null) headers.set("authorization", `Bearer ${id}`);
  if (!UNPROOFED.includes(path.replace(/[?#].*$/u, ""))) {
    headers.set("x-device-proof", await deviceProof(method, url));
  }

  try {
    return await fetch(url, { ...init, credentials: "include", headers });
  } catch {
    throw new AuthError("network", `could not reach ${apiBase}`);
  }
}

function parseUser(raw: UserBody | undefined): QuestUser {
  if (
    typeof raw?.sub !== "string" ||
    typeof raw.name !== "string" ||
    typeof raw.andrew_id !== "string"
  ) {
    throw new AuthError("unknown", "malformed user");
  }

  return {
    sub: raw.sub,
    name: raw.name,
    andrewId: raw.andrew_id,
    email: typeof raw.email === "string" ? raw.email : null,
    groups: Array.isArray(raw.groups) ? raw.groups : [],
    admin: raw.admin === true,
  };
}

/**
 * Carries the device identity into `/auth/login`, which is a browser redirect
 * and cannot send a proof header. The server locks the account to whatever key
 * signed the nonce, so this runs before every sign-in.
 */
export async function loginTicket(): Promise<string> {
  const challenge = await send("/auth/challenge", null);
  if (!challenge.ok) throw new AuthError(await responseError(challenge));

  const nonce = (await readJson<ChallengeBody>(challenge))?.nonce;
  if (typeof nonce !== "string" || nonce.length === 0) {
    throw new AuthError("nonce_invalid", "challenge carried no nonce");
  }

  const response = await send("/auth/device", null, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      public_key: await devicePublicKey(),
      nonce,
      signature: await signChallenge(nonce),
    }),
  });
  if (!response.ok) throw new AuthError(await responseError(response));

  const ticket = (await readJson<TicketBody>(response))?.ticket;
  if (typeof ticket !== "string" || ticket.length === 0) {
    throw new AuthError("device_unverified", "server issued no ticket");
  }

  return ticket;
}

/** Null when the session is gone; the server answers 401, not a body. */
export async function fetchStatus(id: string): Promise<QuestUser | null> {
  const response = await send("/auth/status", id);
  if (response.status === 401) return null;
  if (!response.ok) throw new AuthError(await responseError(response));

  return parseUser(await readJson<UserBody>(response));
}

export async function endSession(id: string): Promise<string | null> {
  const response = await send("/auth/logout", id, { method: "POST" });
  if (!response.ok) return null;

  const raw = await readJson<LogoutBody>(response);
  return typeof raw?.end_session_url === "string" ? raw.end_session_url : null;
}
