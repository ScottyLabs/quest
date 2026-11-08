import type { Session } from "./types";

export interface SessionStorage {
  load(): Promise<Session | null>;
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = "quest.session";

function isSession(value: unknown): value is Session {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "expiresAt" in value &&
    typeof value.expiresAt === "number" &&
    "user" in value &&
    typeof value.user === "object" &&
    value.user !== null &&
    "andrewId" in value.user &&
    typeof value.user.andrewId === "string"
  );
}

function parse(raw: string): Session | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
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
