import { authFetch } from "$lib/auth";
import type { Dorm } from "$lib/mascots";

export interface Profile {
  sub: string;
  andrew_id: string;
  dorm: Dorm | null;
  staff: boolean;
  created_at: string;
}

/**
 * `null` when the backend has no `/users/me` yet, so onboarding can fall back
 * to the local pick instead of trapping a user behind a route that does not
 * exist. A real failure and an undeployed route are indistinguishable here on
 * purpose — neither should block sign-in.
 */
export async function profile(): Promise<Profile | null> {
  try {
    const response = await authFetch("/users/me");
    if (!response.ok) return null;
    return (await response.json()) as Profile;
  } catch {
    return null;
  }
}

/** Returns false when the dorm could not be saved; the caller decides. */
export async function setDorm(dorm: Dorm): Promise<boolean> {
  try {
    const response = await authFetch("/users/me/dorm", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dorm }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
