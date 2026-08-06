import type { Session } from "./types";

export interface SessionStorage {
  load(): Promise<Session | null>;
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = "quest.session";

function parse(raw: string): Session | null {
  try {
    const parsed = JSON.parse(raw) as Session;
    const usable =
      typeof parsed?.id === "string" &&
      typeof parsed.expiresAt === "number" &&
      typeof parsed.user?.andrewId === "string";
    return usable ? parsed : null;
  } catch {
    return null;
  }
}

export const localSessionStorage: SessionStorage = {
  load() {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    return Promise.resolve(raw === null ? null : parse(raw));
  },

  save(session) {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // privacy settings on android?
    }
    return Promise.resolve();
  },

  clear() {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
    return Promise.resolve();
  },
};
