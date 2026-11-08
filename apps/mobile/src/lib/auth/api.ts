/// <reference types="vite/client" />

import {
  deviceProof,
  devicePublicKey,
  noteServerTime,
  resetDeviceKey,
  signChallenge,
} from "./device";
import { AuthError } from "./types";
import type { AuthErrorCode, QuestUser } from "./types";

const configured: unknown = import.meta.env.VITE_QUEST_API_BASE;

export const apiBase =
  typeof configured === "string" && configured.length > 0
    ? configured.replace(/\/$/u, "")
    : "https://cmu.quest";

export const apiUrl = (path: string): string =>
  `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;

type JsonFields = Partial<Record<string, unknown>>;

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
  "device_required",
  "device_mismatch",
  "device_owned",
  "device_unverified",
  "nonce_invalid",
  "public_key_invalid",
  "no_andrew_id",
];

const UNPROOFED: ReadonlySet<string> = new Set([
  "/api/health",
  "/auth/challenge",
  "/auth/device",
  "/auth/device/enroll",
  "/auth/login",
]);

function isFields(value: unknown): value is JsonFields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<JsonFields | undefined> {
  try {
    const body: unknown = await response.json();
    return isFields(body) ? body : undefined;
  } catch {
    return undefined;
  }
}

export function errorCode(raw: unknown): AuthErrorCode {
  return KNOWN_CODES.find((known) => known === raw) ?? "unknown";
}

export async function responseError(response: Response): Promise<AuthErrorCode> {
  return errorCode((await readJson(response))?.["error"]);
}

export async function signed(request: Request, id: string | null): Promise<Response> {
  const headers = new Headers(request.headers);

  if (id !== null) headers.set("authorization", `Bearer ${id}`);
  if (!UNPROOFED.has(new URL(request.url).pathname)) {
    headers.set("x-device-proof", await deviceProof(request.method, request.url));
  }

  let response: Response;
  try {
    response = await fetch(new Request(request, { credentials: "include", headers }));
  } catch {
    throw new AuthError("network", `could not reach ${apiBase}`);
  }

  noteServerTime(response.headers.get("date"));
  return response;
}

export function send(path: string, id: string | null, init: RequestInit = {}): Promise<Response> {
  return signed(new Request(apiUrl(path), init), id);
}

function parseUser(raw: JsonFields | undefined): QuestUser {
  const name = raw?.["name"];
  const andrewId = raw?.["andrew_id"];
  if (typeof name !== "string" || typeof andrewId !== "string") {
    throw new AuthError("unknown", "malformed user");
  }

  const email = raw?.["email"];
  const groups = raw?.["groups"];
  return {
    name,
    andrewId,
    email: typeof email === "string" ? email : null,
    groups: Array.isArray(groups)
      ? groups.filter((group): group is string => typeof group === "string")
      : [],
    admin: raw?.["admin"] === true,
    staff: raw?.["staff"] === true,
  };
}

async function attest(): Promise<Response> {
  const challenge = await send("/auth/challenge", null);
  if (!challenge.ok) throw new AuthError(await responseError(challenge));

  const nonce = (await readJson(challenge))?.["nonce"];
  if (typeof nonce !== "string" || nonce.length === 0) {
    throw new AuthError("nonce_invalid", "challenge carried no nonce");
  }

  return send("/auth/device", null, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      public_key: await devicePublicKey(),
      nonce,
      signature: await signChallenge(nonce),
    }),
  });
}

export async function loginTicket(): Promise<string> {
  let response = await attest();

  if (response.status === 401) {
    await resetDeviceKey();
    response = await attest();
  }

  if (!response.ok) throw new AuthError(await responseError(response));

  const ticket = (await readJson(response))?.["ticket"];
  if (typeof ticket !== "string" || ticket.length === 0) {
    throw new AuthError("device_unverified", "server issued no ticket");
  }

  return ticket;
}

export async function enrollDevice(id: string): Promise<boolean> {
  const response = await send("/auth/device/enroll", id, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ticket: await loginTicket() }),
  });

  if (!response.ok) return false;
  return (await readJson(response))?.["enrolled"] === true;
}

export async function fetchStatus(id: string): Promise<QuestUser | null> {
  const response = await send("/auth/status", id);
  if (response.status === 401) return null;
  if (!response.ok) throw new AuthError(await responseError(response));

  return parseUser(await readJson(response));
}

export async function endSession(id: string): Promise<string | null> {
  const response = await send("/auth/logout", id, { method: "POST" });
  if (!response.ok) return null;

  const endSessionUrl = (await readJson(response))?.["end_session_url"];
  return typeof endSessionUrl === "string" ? endSessionUrl : null;
}
