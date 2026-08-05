export interface QuestUser {
  sub: string;
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
  network: "Couldn't reach the quest server. Check your connection.",
  cancelled: "Sign-in was cancelled.",
  unknown: "Something went wrong signing in. Please try again.",
};

export function authMessage(error: unknown): string {
  return error instanceof AuthError ? MESSAGES[error.code] : MESSAGES.unknown;
}
