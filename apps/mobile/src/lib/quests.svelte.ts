import { api } from "$lib/api/client";
import type { components } from "$lib/api/schema";
import { Resource } from "$lib/cache.svelte";
import { fix } from "$lib/geo";
import { FALLBACK, THEMES } from "$lib/theme";

export type QuestState = "open" | "done";

export interface Quest {
  id: string;
  title: string;
  detail: string;
  description: string;
  reward: number;
  state: QuestState;
  category: string;
  opensAt: string;
  secret: boolean;
}

export type ChallengeView = components["schemas"]["ChallengeView"];

export type Registered = components["schemas"]["Registered"];

export class TapError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export async function registerTap(url: string): Promise<Registered> {
  const where = await fix();
  const { data, error } = await api.POST("/api/register_tap", { body: { url, ...where } });
  if (data !== undefined) return data;

  throw new TapError(error?.error ?? "unknown");
}

export const CATEGORIES: string[] = Object.keys(THEMES).filter((id) => id !== "secrets");

export function toQuest(row: ChallengeView): Quest {
  return {
    id: row.id,
    title: row.name,
    detail: row.tagline,
    description: row.description,
    reward: row.coin_value,
    state: row.cleared ? "done" : "open",
    category: row.category,
    opensAt: row.open_from,
    secret: row.secret,
  };
}

const TTL = 15 * 60 * 1000;

export const assignment = $state<{ day: string | null; quest: Quest | null }>({
  day: null,
  quest: null,
});

async function refreshDaily(): Promise<void> {
  try {
    const { data, response } = await api.GET("/api/users/me/daily");
    if (!response.ok || data === undefined) return;

    assignment.day = data.day;
    assignment.quest = data.challenge ? toQuest(data.challenge) : null;
  } catch {
    // Keep the previous daily assignment if refresh fails.
  }
}

async function board(): Promise<Quest[]> {
  const { data, response } = await api.GET("/api/challenges");
  if (!response.ok || data === undefined) {
    throw new Error(`challenges responded ${response.status}`);
  }

  return data.challenges.map(toQuest);
}

async function load(): Promise<Quest[]> {
  const [rows] = await Promise.all([board(), refreshDaily()]);

  return rows;
}

function isQuest(raw: unknown): raw is Quest {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "id" in raw &&
    typeof raw.id === "string" &&
    "title" in raw &&
    typeof raw.title === "string" &&
    "detail" in raw &&
    typeof raw.detail === "string" &&
    "description" in raw &&
    typeof raw.description === "string" &&
    "reward" in raw &&
    typeof raw.reward === "number" &&
    "state" in raw &&
    (raw.state === "open" || raw.state === "done") &&
    "category" in raw &&
    typeof raw.category === "string" &&
    "opensAt" in raw &&
    typeof raw.opensAt === "string" &&
    "secret" in raw &&
    typeof raw.secret === "boolean"
  );
}

function revive(raw: unknown): Quest[] | null {
  if (!Array.isArray(raw) || !raw.every((item) => isQuest(item))) return null;
  return raw;
}

export const quests = new Resource<Quest[]>({
  key: "quest.cache.challenges",
  ttl: TTL,
  load,
  revive,
});

export function inCategory(all: Quest[], id: string): Quest[] {
  if (id === FALLBACK) {
    const normal = all.filter((quest) => !quest.secret);
    const secrets = all.filter((quest) => quest.secret);

    return [...normal, ...secrets];
  }

  return all.filter((quest) => !quest.secret && quest.category === id);
}

export function countedTotal(list: Quest[]): number {
  return list.reduce((count, quest) => count + (quest.secret ? 0 : 1), 0);
}

export function done(list: Quest[]): number {
  return list.reduce((count, quest) => count + (quest.state === "done" ? 1 : 0), 0);
}

export function nextUnlock(list: Quest[], now: number): number | null {
  let soonest: number | null = null;

  for (const quest of list) {
    const at = Date.parse(quest.opensAt);
    if (Number.isNaN(at) || at <= now) continue;
    if (soonest === null || at < soonest) soonest = at;
  }

  return soonest;
}

export function unlockedAt(quest: Quest): string {
  const opens = new Date(quest.opensAt);
  const day = opens.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
  const hour = opens.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).toLowerCase();

  return `Unlocks on ${day} at ${hour}`;
}
