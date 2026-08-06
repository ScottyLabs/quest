export interface QuestUser {
  email: string | null;
  name: string;
  andrewId: string;
  groups: string[];
  admin: boolean;
}

export interface Session {
  id: string;
  /** epoch ms */
  expiresAt: number;
  user: QuestUser;
}

export type AuthPhase = "restoring" | "signedOut" | "awaitingBrowser" | "signedIn";

export type AuthErrorCode =
  | "auth_not_configured"
  | "oidc_discovery_failed"
  | "session_store_unavailable"
  | "access_denied"
  | "login_required"
  | "idp_error"
  | "sign_in_failed"
  | "invalid_return"
  | "expired_token"
  | "unauthorized"
  | "proof_required"
  | "proof_invalid"
  | "proof_replayed"
  | "device_unknown"
  | "device_mismatch"
  | "device_owned"
  | "device_unverified"
  | "nonce_invalid"
  | "public_key_invalid"
  | "no_andrew_id"
  | "network"
  | "cancelled"
  | "unknown";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AuthError";
    this.code = code;
  }
}

const MESSAGES: Record<AuthErrorCode, string> = {
  auth_not_configured: "Sign-in isn't set up on the server yet.",
  oidc_discovery_failed: "Sign-in is unavailable right now. Try again shortly.",
  session_store_unavailable: "The quest server is having trouble. Try again shortly.",
  access_denied: "Sign-in was declined. You can try again.",
  login_required: "Please sign in again.",
  idp_error: "Sign-in failed upstream. Please try again.",
  sign_in_failed: "That sign-in link didn't work. Please try again.",
  invalid_return: "Something went wrong signing in. Please try again.",
  expired_token: "That sign-in took too long. Please try again.",
  unauthorized: "Your session expired. Please sign in again.",
  proof_required: "This phone isn't verified. Please sign in again.",
  proof_invalid: "Couldn't verify this phone. Please sign in again.",
  proof_replayed: "That request was already sent. Please try again.",
  device_unknown: "That phone isn't registered to your account.",
  device_mismatch: "This phone doesn't match the one you signed in on. Please sign in again.",
  device_owned:
    "This phone is already claimed by another account. Sign in with that account, or use a different phone.",
  device_unverified: "Couldn't verify this phone's security key. Please try again.",
  nonce_invalid: "Verifying this phone took too long. Please sign in again.",
  public_key_invalid: "This phone's security key was rejected. Please try again.",
  no_andrew_id: "Your CMU account didn't return an Andrew ID. Contact ScottyLabs.",
  network: "Couldn't reach the quest server. Check your connection.",
  cancelled: "Sign-in was cancelled.",
  unknown: "Something went wrong signing in. Please try again.",
};

export function authMessage(error: unknown): string {
  return error instanceof AuthError ? MESSAGES[error.code] : MESSAGES.unknown;
}
