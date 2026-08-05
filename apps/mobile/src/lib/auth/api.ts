/// <reference types="vite/client" />

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

interface StatusBody {
  logged_in: boolean;
  user: UserBody | null;
}

interface LogoutBody {
  end_session_url: string | null;
}

interface ErrorBody {
  error: string;
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
];

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

export async function send(path: string, id: string, init: RequestInit = {}): Promise<Response> {
  const url = apiUrl(path);
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${id}`);

  try {
    return await fetch(url, { ...init, credentials: "include", headers });
  } catch {
    throw new AuthError("network", `could not reach ${apiBase}`);
  }
}

function parseUser(raw: UserBody | undefined | null): QuestUser {
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

export async function fetchUser(id: string): Promise<QuestUser | null> {
  const response = await send("/auth/status", id);
  if (!response.ok) throw new AuthError(await responseError(response));

  const raw = await readJson<StatusBody>(response);
  return raw?.logged_in === true ? parseUser(raw.user) : null;
}

export async function endSession(id: string): Promise<string | null> {
  const response = await send("/auth/logout", id, { method: "POST" });
  if (!response.ok) return null;

  const raw = await readJson<LogoutBody>(response);
  return typeof raw?.end_session_url === "string" ? raw.end_session_url : null;
}
