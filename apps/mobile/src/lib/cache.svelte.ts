import { browser } from "$app/environment";

interface Entry<T> {
  at: number;
  data: T;
}

export interface ResourceOptions<T> {
  key: string;
  ttl: number;
  load: () => Promise<T>;
  revive?: (raw: unknown) => T | null;
}

export class Resource<T> {
  #data = $state<T | null>(null);
  #at = $state(0);
  #loading = $state(false);
  #error = $state<unknown>(null);
  #inflight: Promise<void> | null = null;
  #hydrated = false;
  readonly #options: ResourceOptions<T>;

  constructor(options: ResourceOptions<T>) {
    this.#options = options;
  }

  get data(): T | null {
    return this.#data;
  }

  get loading(): boolean {
    return this.#loading;
  }

  get error(): unknown {
    return this.#error;
  }

  get updatedAt(): number {
    return this.#at;
  }

  get stale(): boolean {
    return this.#at === 0 || Date.now() - this.#at >= this.#options.ttl;
  }

  reload(): Promise<void> {
    this.#hydrate();
    this.#inflight ??= this.#run();
    return this.#inflight;
  }

  ensure(): Promise<void> {
    this.#hydrate();
    return this.stale ? this.reload() : Promise.resolve();
  }

  clear(): void {
    this.#data = null;
    this.#at = 0;
    this.#error = null;
    if (browser) globalThis.localStorage?.removeItem(this.#options.key);
  }

  async #run(): Promise<void> {
    this.#loading = true;

    try {
      this.#data = await this.#options.load();
      this.#at = Date.now();
      this.#error = null;
      this.#store();
    } catch (error) {
      this.#error = error;
    } finally {
      this.#loading = false;
      this.#inflight = null;
    }
  }

  #hydrate(): void {
    if (this.#hydrated || !browser) return;
    this.#hydrated = true;

    const raw = globalThis.localStorage?.getItem(this.#options.key);
    if (!raw) return;

    try {
      const entry = JSON.parse(raw) as Entry<unknown>;
      if (typeof entry?.at !== "number") return;

      const revived = this.#options.revive?.(entry.data) ?? (entry.data as T);
      if (revived === null) return;

      this.#data = revived;
      this.#at = entry.at;
    } catch {
      globalThis.localStorage?.removeItem(this.#options.key);
    }
  }

  #store(): void {
    if (!browser || this.#data === null) return;

    try {
      const entry: Entry<T> = { at: this.#at, data: this.#data };
      globalThis.localStorage?.setItem(this.#options.key, JSON.stringify(entry));
    } catch {
      this.#error = this.#error ?? new Error("cache write failed");
    }
  }
}
