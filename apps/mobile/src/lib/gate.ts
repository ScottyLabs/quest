import { goto } from "$app/navigation";
import { session } from "$lib/auth";
import { me } from "$lib/user.svelte";

export const WELCOME = "/";
export const HOME = "/app";
export const DORM_PICKER = "/mascots";

export function destination(): string | null {
  if (session.phase === "restoring" || session.phase === "awaitingBrowser") return null;
  if (!session.signedIn) return WELCOME;

  void me.load();

  if (!me.settled) return null;

  return me.needsDorm ? DORM_PICKER : HOME;
}

export function steer(here: string): void {
  const to = destination();
  if (to !== null && to !== here) void goto(to, { replaceState: true });
}
