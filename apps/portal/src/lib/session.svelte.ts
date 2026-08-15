import { resolve } from "$app/paths";

const STORE_KEY = "quest.portal.session";

type Stored = { id: string; expires: number };

export type Phase = "restoring" | "anonymous" | "signedIn";

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return null;

    const { id, expires } = parsed as { id?: unknown; expires?: unknown };
    if (typeof id !== "string" || typeof expires !== "number") return null;
    if (expires <= Date.now()) return null;

    return { id, expires };
  } catch {
    return null;
  }
}

function save(stored: Stored | null): void {
  try {
    if (stored === null) localStorage.removeItem(STORE_KEY);
    else localStorage.setItem(STORE_KEY, JSON.stringify(stored));
  } catch {
    return;
  }
}

class Session {
  #phase = $state<Phase>("restoring");
  #id = $state<string | null>(null);

  get phase(): Phase {
    return this.#phase;
  }

  get id(): string | null {
    return this.#id;
  }

  get signedIn(): boolean {
    return this.#phase === "signedIn";
  }

  restore(): void {
    if (this.#phase !== "restoring") return;

    const stored = load();
    this.#id = stored?.id ?? null;
    this.#phase = stored === null ? "anonymous" : "signedIn";
  }

  adopt(hash: string): boolean {
    const fragment = new URLSearchParams(hash.replace(/^#/u, ""));
    const failure = fragment.get("error");

    if (failure !== null) throw new Error(failure);

    const id = fragment.get("session");
    if (id === null || id.length === 0) return false;

    const lifetime = Number(fragment.get("expires_in") ?? "0");

    save({ id, expires: Date.now() + (Number.isFinite(lifetime) ? lifetime : 0) * 1000 });
    this.#id = id;
    this.#phase = "signedIn";
    return true;
  }

  clear(): void {
    save(null);
    this.#id = null;
    this.#phase = "anonymous";
  }

  start(): void {
    const target = encodeURIComponent(`${location.origin}${resolve("/callback")}`);
    location.assign(`/auth/login?portal=1&return=${target}`);
  }
}

export const session = new Session();
