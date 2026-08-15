import { api, unwrap, type Capability, type Identity, type Level } from "$lib/api/client";

const RANK: Record<Level, number> = { none: 0, read: 1, edit: 2, full: 3 };

class Me {
  #identity = $state<Identity | null>(null);
  #settled = $state(false);
  #loading: Promise<void> | null = null;

  get identity(): Identity | null {
    return this.#identity;
  }

  get settled(): boolean {
    return this.#settled;
  }

  get name(): string {
    return this.#identity?.name ?? "";
  }

  get andrewId(): string {
    return this.#identity?.andrew_id ?? "";
  }

  can(capability: Capability): boolean {
    return this.#identity?.capabilities.includes(capability) ?? false;
  }

  level(table: string): Level {
    return this.#identity?.tables.find((grant) => grant.table === table)?.level ?? "none";
  }

  allows(table: string, needed: Level): boolean {
    return RANK[this.level(table)] >= RANK[needed] && this.level(table) !== "none";
  }

  get grantedTables(): string[] {
    return this.#identity?.tables.map((grant) => grant.table) ?? [];
  }

  load(): Promise<void> {
    if (this.#settled) return Promise.resolve();
    this.#loading ??= this.#fetch();

    return this.#loading;
  }

  reload(): Promise<void> {
    this.#settled = false;
    this.#loading = this.#fetch();

    return this.#loading;
  }

  async #fetch(): Promise<void> {
    try {
      this.#identity = await unwrap(await api.GET("/api/portal/me"));
    } finally {
      this.#settled = true;
      this.#loading = null;
    }
  }

  forget(): void {
    this.#identity = null;
    this.#settled = false;
    this.#loading = null;
  }
}

export const me = new Me();
