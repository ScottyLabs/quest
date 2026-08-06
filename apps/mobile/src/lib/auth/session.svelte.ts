import { browser } from "$app/environment";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import {
  apiBase,
  endSession,
  errorCode,
  fetchStatus,
  loginTicket,
  responseError,
  send,
} from "./api";
import { localSessionStorage } from "./storage";
import type { SessionStorage } from "./storage";
import { AuthError } from "./types";
import type { AuthPhase, QuestUser, Session } from "./types";

const NATIVE_TARGET = "org.scottylabs.quest://oauth";

export type OpenUrl = (url: string) => void | Promise<void>;

export interface LoginOptions {
  signal?: AbortSignal;
  openUrl?: OpenUrl;
}

export interface LogoutOptions {
  endSsoSession?: boolean;
  openUrl?: OpenUrl;
}

async function openInBrowser(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) return await Browser.open({ url });
  window.open(url, "_blank");
}

type Fragment = { id: string; expiresAt: number } | { error: AuthError };

function parseFragment(hash: string): Fragment | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

  const failure = params.get("error");
  if (failure !== null) return { error: new AuthError(errorCode(failure)) };

  const id = params.get("session");
  const expiresIn = Number(params.get("expires_in"));
  if (id === null || !Number.isFinite(expiresIn)) return null;

  return { id, expiresAt: Date.now() + expiresIn * 1000 };
}

class SessionStore {
  #session = $state<Session | null>(null);
  #phase = $state<AuthPhase>("restoring");
  #deviceOwned = $state(false);
  readonly #storage: SessionStorage = localSessionStorage;
  #adopting: { hash: string; user: Promise<QuestUser | null> } | null = null;
  #restored: Promise<void> | null = null;

  get user(): QuestUser | null {
    return this.#session?.user ?? null;
  }

  get phase(): AuthPhase {
    return this.#phase;
  }

  get signedIn(): boolean {
    return this.#phase === "signedIn";
  }

  /**
   * This phone belongs to another account. Terminal: the server refused to
   * mint a session, so there is nothing to retry on this device.
   */
  get deviceOwned(): boolean {
    return this.#deviceOwned;
  }

  restore(): Promise<void> {
    this.#restored ??= this.#restoreOnce();
    return this.#restored;
  }

  async #restoreOnce(): Promise<void> {
    try {
      if (browser && (await this.#consume(location.hash))) return;

      const stored = browser ? await this.#storage.load() : null;
      if (!stored || stored.expiresAt <= Date.now()) {
        this.clear();
        return;
      }

      this.#session = stored;
      this.#phase = "signedIn";
    } catch (error) {
      console.error("session restore failed", error);
      this.#phase = "signedOut";
    }
  }

  async adoptFragment(hash: string): Promise<QuestUser | null> {
    if (this.#adopting?.hash !== hash) this.#adopting = { hash, user: this.#adoptOnce(hash) };
    return await this.#adopting.user;
  }

  #blocked(error: unknown): void {
    if (error instanceof AuthError && error.code === "device_owned") this.#deviceOwned = true;
  }

  async #adoptOnce(hash: string): Promise<QuestUser | null> {
    const parsed = parseFragment(hash);
    if (parsed === null) return null;

    if ("error" in parsed) {
      this.#phase = this.#session ? "signedIn" : "signedOut";
      throw parsed.error;
    }

    try {
      const user = await fetchStatus(parsed.id);
      if (user === null) throw new AuthError("unauthorized");

      this.#adopt({ id: parsed.id, expiresAt: parsed.expiresAt, user });
      return user;
    } catch (error) {
      this.#phase = this.#session ? "signedIn" : "signedOut";
      throw error;
    }
  }

  async login(options: LoginOptions = {}): Promise<QuestUser> {
    this.#deviceOwned = false;

    const ticket = await loginTicket();
    const native = Capacitor.isNativePlatform();
    const target = native ? NATIVE_TARGET : `${location.origin}/auth/callback`;
    const url = `${apiBase}/auth/login?return=${encodeURIComponent(target)}&ticket=${ticket}`;

    if (!native) {
      location.assign(url);
      return await new Promise<QuestUser>(() => {});
    }

    if (options.signal?.aborted) throw new AuthError("cancelled");

    const { promise, resolve, reject } = Promise.withResolvers<string>();
    const abort = () => reject(new AuthError("cancelled"));
    options.signal?.addEventListener("abort", abort, { once: true });

    const listener = await App.addListener("appUrlOpen", ({ url: opened }) => {
      const hash = opened.indexOf("#");
      if (hash !== -1) resolve(opened.slice(hash));
    });

    this.#phase = "awaitingBrowser";

    try {
      await (options.openUrl ?? openInBrowser)(url);
      const user = await this.adoptFragment(await promise);
      if (user === null) throw new AuthError("unknown", "empty callback fragment");
      return user;
    } catch (error) {
      this.#blocked(error);
      this.#phase = this.#session ? "signedIn" : "signedOut";
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", abort);
      await listener.remove();
      await Browser.close().catch(() => undefined);
    }
  }

  async logout(options: LogoutOptions = {}): Promise<void> {
    const current = this.#session;
    this.clear();
    if (!current) return;

    const url = await endSession(current.id).catch(() => null);
    if (url && options.endSsoSession) await (options.openUrl ?? openInBrowser)(url);
  }

  get id(): string {
    const current = this.#session;
    if (!current) throw new AuthError("unauthorized", "not signed in");
    if (current.expiresAt <= Date.now()) {
      this.clear();
      throw new AuthError("unauthorized", "session expired");
    }
    return current.id;
  }

  clear(): void {
    this.#session = null;
    this.#phase = "signedOut";
    this.#deviceOwned = false;
    void this.#storage.clear();
  }

  async #consume(hash: string): Promise<boolean> {
    if (parseFragment(hash) === null) return false;

    const adopted = await this.adoptFragment(hash).catch((error: unknown) => {
      this.#blocked(error);
      return null;
    });
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    if (adopted === null) this.#phase = this.#session ? "signedIn" : "signedOut";
    return adopted !== null;
  }

  #adopt(session: Session): void {
    this.#session = session;
    this.#phase = "signedIn";
    if (browser) void this.#storage.save(session);
  }
}

export const session = new SessionStore();

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await send(path, session.id, init);
  if (response.status !== 401) return response;

  const code = await responseError(response);
  session.clear();
  throw new AuthError(code === "unknown" ? "unauthorized" : code);
}
