import { api } from "$lib/api/client";
import type { components } from "$lib/api/schema";
import type { Dorm } from "$lib/mascots";

export type Profile = Omit<components["schemas"]["Profile"], "dorm"> & {
  dorm: Dorm | null;
};

export async function profile(): Promise<Profile | null> {
  try {
    const { data } = await api.GET("/api/users/me");
    return (data as Profile | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function setDorm(dorm: Dorm): Promise<boolean> {
  try {
    const { response } = await api.PUT("/api/users/me/dorm", { body: { dorm } });
    return response.ok;
  } catch {
    return false;
  }
}
