import { authFetch } from "$lib/auth";
import type { Dorm } from "$lib/mascots";

export interface Profile {
  andrew_id: string;
  dorm: Dorm | null;
  staff: boolean;
  created_at: string;
}

export async function profile(): Promise<Profile | null> {
  try {
    const response = await authFetch("/users/me");
    if (!response.ok) return null;
    return (await response.json()) as Profile;
  } catch {
    return null;
  }
}

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
