import { authFetch } from "$lib/auth";
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
}

export interface ChallengeView {
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

export interface Registered {
  challenge: ChallengeView;
  place: number;
  first: boolean;
  current_scottycoins: number;
  current_thistlestones: number;
}

interface TapFailure {
  error?: string;
}

export class TapError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export async function registerTap(url: string): Promise<Registered> {
  const where = await fix();
  const response = await authFetch("/api/register_tap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, ...where }),
  });
  if (response.ok) return (await response.json()) as Registered;

  const code = ((await response.json().catch(() => ({}))) as TapFailure).error ?? "unknown";
  throw new TapError(code);
}

export const CATEGORIES: string[] = Object.keys(THEMES);

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
  };
}

const TTL = 15 * 60 * 1000;

interface DailyBody {
  day: string;
  challenge: ChallengeView | null;
}

export const assignment = $state<{ day: string | null; quest: Quest | null }>({
  day: null,
  quest: null,
});

async function refreshDaily(): Promise<void> {
  const response = await authFetch("/api/users/me/daily").catch(() => null);
  if (response === null || !response.ok) return;

  const body = (await response.json().catch(() => null)) as DailyBody | null;
  if (body === null) return;

  assignment.day = body.day;
  assignment.quest = body.challenge === null ? null : toQuest(body.challenge);
}

async function board(): Promise<Quest[]> {
  const response = await authFetch("/api/challenges");
  if (!response.ok) throw new Error(`challenges responded ${response.status}`);

  const body = (await response.json()) as BoardBody;

  return body.challenges.map(toQuest);
}

async function load(): Promise<Quest[]> {
  const [rows] = await Promise.all([board(), refreshDaily()]);

  return rows;
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
