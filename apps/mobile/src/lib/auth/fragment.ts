import { errorCode } from "./api";
import { AuthError } from "./types";

const FALLBACK_TTL = 90 * 24 * 60 * 60;

export type Fragment = { id: string; expiresAt: number } | { error: AuthError };

export function parseFragment(hash: string): Fragment | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

  const failure = params.get("error");
  if (failure !== null) return { error: new AuthError(errorCode(failure)) };

  const id = params.get("session");
  if (id === null) return null;

  const raw = params.get("expires_in");
  const expiresIn = raw === null ? NaN : Number(raw);
  const window = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : FALLBACK_TTL;

  return { id, expiresAt: Date.now() + window * 1000 };
}
