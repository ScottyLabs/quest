import { browser } from "$app/environment";
import { api } from "$lib/api/client";
import type { components } from "$lib/api/schema";
import { session } from "$lib/auth";
import { MASCOTS } from "$lib/mascots";
import type { Dorm } from "$lib/mascots";

export type Profile = Omit<components["schemas"]["Profile"], "dorm"> & {
  dorm: Dorm | null;
};

export type ProfilePhase = "idle" | "loading" | "ready" | "failed";

const MASCOT_KEY = "quest.mascot";

export function mascotFor(dorm: Dorm | null): string | null {
  if (dorm === null) return null;
  return Object.keys(MASCOTS).find((slug) => MASCOTS[slug]?.mascot.dorm === dorm) ?? null;
}

function remembered(): string | null {
  return browser ? localStorage.getItem(MASCOT_KEY) : null;
}

class ProfileStore {
  #profile = $state<Profile | null>(null);
  #phase = $state<ProfilePhase>("idle");
  #chosen = $state<Dorm | null>(null);
  #veiled = $state<boolean | null>(null);
  #inflight: Promise<Profile | null> | null = null;
  #owner: string | null = null;

  get current(): Profile | null {
    return this.#profile;
  }

  get phase(): ProfilePhase {
    return this.#phase;
  }

  get dorm(): Dorm | null {
    return this.#profile?.dorm ?? this.#chosen;
  }

  get anonymous(): boolean {
    return this.#veiled ?? this.#profile?.anonymous ?? false;
  }

  get settled(): boolean {
    return this.#phase === "ready" || this.#phase === "failed";
  }

  get needsDorm(): boolean {
    return this.#phase === "ready" && this.dorm === null;
  }

  get mascot(): string | null {
    return mascotFor(this.dorm) ?? remembered();
  }

  load(): Promise<Profile | null> {
    const owner = session.user?.andrewId ?? null;

    if (!session.signedIn) {
      this.reset();
      return Promise.resolve(null);
    }

    if (owner !== this.#owner) {
      this.reset();
      this.#owner = owner;
    }

    this.#inflight ??= this.#loadOnce();
    return this.#inflight;
  }

  reload(): Promise<Profile | null> {
    this.#inflight = null;
    return this.load();
  }

  async #loadOnce(): Promise<Profile | null> {
    if (this.#phase !== "ready") this.#phase = "loading";

    try {
      const { data } = await api.GET("/api/users/me");
      const found = (data as Profile | undefined) ?? null;

      this.#profile = found;
      this.#chosen = null;
      this.#veiled = null;
      this.#phase = "ready";
      this.#remember(found?.dorm ?? null);

      return found;
    } catch {
      this.#phase = "failed";
      return this.#profile;
    }
  }

  async chooseDorm(dorm: Dorm): Promise<boolean> {
    try {
      const { response } = await api.PUT("/api/users/me/dorm", { body: { dorm } });
      if (!response.ok) return false;
    } catch {
      return false;
    }

    this.#chosen = dorm;
    if (this.#profile !== null) this.#profile = { ...this.#profile, dorm };
    this.#remember(dorm);
    void this.reload();

    return true;
  }

  async setAnonymous(anonymous: boolean): Promise<boolean> {
    const was = this.anonymous;
    this.#veiled = anonymous;
    if (this.#profile !== null) this.#profile = { ...this.#profile, anonymous };

    const ok = await api
      .PUT("/api/users/me/anonymous", { body: { anonymous } })
      .then(({ response }) => response.ok)
      .catch(() => false);

    if (!ok) {
      this.#veiled = was;
      if (this.#profile !== null) this.#profile = { ...this.#profile, anonymous: was };
    }

    return ok;
  }

  reset(): void {
    this.#inflight = null;
    this.#owner = null;
    if (
      this.#profile === null &&
      this.#phase === "idle" &&
      this.#chosen === null &&
      this.#veiled === null
    ) {
      return;
    }

    this.#profile = null;
    this.#chosen = null;
    this.#veiled = null;
    this.#phase = "idle";
  }

  #remember(dorm: Dorm | null): void {
    const slug = mascotFor(dorm);
    if (slug !== null && browser) localStorage.setItem(MASCOT_KEY, slug);
  }
}

export const me = new ProfileStore();
