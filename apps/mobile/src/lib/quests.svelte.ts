import { authFetch } from "$lib/auth";
import { Resource } from "$lib/cache.svelte";
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
}

interface ChallengeView {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  coin_value: number;
  open_from: string;
  cleared: boolean;
}

interface BoardBody {
  challenges: ChallengeView[];
}

export const CATEGORIES: string[] = Object.keys(THEMES);

export const BALANCE = 260;

const TTL = 15 * 60 * 1000;

async function load(): Promise<Quest[]> {
  const response = await authFetch("/challenges");
  if (!response.ok) throw new Error(`challenges responded ${response.status}`);

  const body = (await response.json()) as BoardBody;

  return body.challenges.map((row) => ({
    id: row.id,
    title: row.name,
    detail: row.tagline,
    description: row.description,
    reward: row.coin_value,
    state: row.cleared ? "done" : "open",
    category: row.category,
    opensAt: row.open_from,
  }));
}

function revive(raw: unknown): Quest[] | null {
  return Array.isArray(raw) ? (raw as Quest[]) : null;
}

export const quests = new Resource<Quest[]>({
  key: "quest.cache.challenges",
  ttl: TTL,
  load,
  revive,
});

export function inCategory(all: Quest[], id: string): Quest[] {
  return id === FALLBACK ? all : all.filter((quest) => quest.category === id);
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
