import { browser } from "$app/environment";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { openExternal } from "$lib/external";
import { apiBase, endSession, enrollDevice, fetchStatus, loginTicket } from "./api";
import { parseFragment } from "./fragment";
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

function pause(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();

  setTimeout(resolve, ms);

  return promise;
}

class SessionStore {
  #session = $state<Session | null>(null);
  #phase = $state<AuthPhase>("restoring");
  #deviceOwned = $state(false);
  #enrolled = $state(true);
  readonly #storage: SessionStorage = localSessionStorage;
  #adopting: { hash: string; user: Promise<QuestUser | null> } | null = null;
  #restored: Promise<void> | null = null;
  #signingIn: Promise<QuestUser> | null = null;

  get user(): QuestUser | null {
    return this.#session?.user ?? null;
  }

  get enrolled(): boolean {
    return this.#enrolled;
  }

  get phase(): AuthPhase {
    return this.#phase;
  }

  get signedIn(): boolean {
    return this.#phase === "signedIn";
  }

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

      if (this.#session !== null) return;
      if (!stored) {
        this.clear();
        return;
      }

      this.#session = stored;
      this.#phase = "signedIn";
      await this.#enrol(stored.id);

      if (this.#current(stored)) await this.#recheck(stored);
    } catch (error) {
      console.error("session restore failed", error);
      if (this.#session === null) this.#phase = "signedOut";
    }
  }

  async #enrol(id: string): Promise<void> {
    if (await this.#tryEnrol(id)) return;

    if (!this.#deviceOwned) {
      await pause(400);
      if (await this.#tryEnrol(id)) return;
    }

    this.#enrolled = false;
    console.error("device enrolment failed; signed in but the API will refuse this device");
  }

  async #tryEnrol(id: string): Promise<boolean> {
    const enrolled = await enrollDevice(id).catch((error: unknown) => {
      this.#blocked(error);
      return false;
    });
    if (enrolled) this.#enrolled = true;
    return enrolled;
  }

  #current(stored: Session): boolean {
    return this.#session?.id === stored.id;
  }

  async #recheck(stored: Session): Promise<void> {
    let fresh: QuestUser | null;

    try {
      fresh = await fetchStatus(stored.id);
    } catch {
      return;
    }

    if (!this.#current(stored)) return;

    if (fresh === null) {
      this.clear();
      return;
    }

    this.#adopt({ ...stored, user: fresh });
  }

  adoptFragment(hash: string): Promise<QuestUser | null> {
    if (this.#adopting?.hash !== hash) this.#adopting = { hash, user: this.#adoptOnce(hash) };
    return this.#adopting.user;
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
      let user = await fetchStatus(parsed.id);

      if (user === null) {
        await this.#enrol(parsed.id);
        user = await fetchStatus(parsed.id);
      }

      if (user === null) throw new AuthError("unauthorized");

      this.#adopt({ id: parsed.id, expiresAt: parsed.expiresAt, user });
      return user;
    } catch (error) {
      this.#phase = this.#session ? "signedIn" : "signedOut";
      throw error;
    }
  }

  login(options: LoginOptions = {}): Promise<QuestUser> {
    this.#signingIn ??= this.#loginOnce(options)
      .catch((error: unknown) => {
        this.#blocked(error);
        this.#phase = this.#session ? "signedIn" : "signedOut";
        throw error;
      })
      .finally(() => {
        this.#signingIn = null;
      });
    return this.#signingIn;
  }

  async #loginOnce(options: LoginOptions): Promise<QuestUser> {
    this.#deviceOwned = false;
    this.#phase = "awaitingBrowser";

    const ticket = await loginTicket();
    const native = Capacitor.isNativePlatform();
    const target = native ? NATIVE_TARGET : `${location.origin}/auth/callback`;
    const url = `${apiBase}/auth/login?return=${encodeURIComponent(target)}&ticket=${ticket}`;

    if (!native) {
      location.assign(url);
      return new Promise<QuestUser>(() => {});
    }

    if (options.signal?.aborted === true) throw new AuthError("cancelled");

    const { promise, resolve, reject } = Promise.withResolvers<string>();
    const abort = () => {
      reject(new AuthError("cancelled"));
    };
    options.signal?.addEventListener("abort", abort, { once: true });

    const listener = await App.addListener("appUrlOpen", ({ url: opened }) => {
      const hash = opened.indexOf("#");
      if (hash !== -1) resolve(opened.slice(hash));
    });

    this.#phase = "awaitingBrowser";

    try {
      await (options.openUrl ?? openExternal)(url);
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
      await Browser.close().catch(() => {});
    }
  }

  async logout(options: LogoutOptions = {}): Promise<void> {
    const current = this.#session;
    this.clear();
    if (!current) return;

    const url = await endSession(current.id).catch(() => null);
    if (url !== null && url !== "" && options.endSsoSession === true) {
      await (options.openUrl ?? openExternal)(url);
    }
  }

  get id(): string {
    const current = this.#session;
    if (!current) throw new AuthError("unauthorized", "not signed in");
    return current.id;
  }

  clear(): void {
    this.#session = null;
    this.#phase = "signedOut";
    this.#deviceOwned = false;
    this.#enrolled = true;
    void this.#storage.clear();
  }

  async adoptCallback(url: string | null | undefined): Promise<boolean> {
    if (typeof url !== "string") return false;

    const cut = url.indexOf("#");
    if (cut === -1) return false;

    const hash = url.slice(cut);
    if (parseFragment(hash) === null) return false;

    const user = await this.adoptFragment(hash).catch((error: unknown) => {
      this.#blocked(error);
      return null;
    });
    return user !== null;
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
