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

export interface Registered {
  challenge: ChallengeView;
  counter: number;
  first: boolean;
}

interface TapFailure {
  error?: string;
}

export class TapError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const TAP_MESSAGES: Record<string, string> = {
  tap_signature: "That tag couldn't be verified.",
  tap_url_malformed: "That tag didn't carry a quest link.",
  card_unassigned: "That tag isn't linked to a challenge yet.",
  tap_replayed: "That tap was already counted.",
  tap_out_of_range: "You're too far from this challenge.",
};

export async function registerTap(url: string): Promise<Registered> {
  const where = await fix();
  const response = await authFetch("/api/register_tap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, ...where }),
  });
  if (response.ok) return (await response.json()) as Registered;

  const code = ((await response.json().catch(() => ({}))) as TapFailure).error ?? "unknown";
  throw new TapError(code, TAP_MESSAGES[code] ?? "Couldn't register that tap.");
}

export const CATEGORIES: string[] = Object.keys(THEMES);

export const BALANCE = 260;

//TODO: temporary placeholder
export const DAILY: Quest = {
  id: "daily-placeholder",
  title: "You have got Mail",
  detail: "Deliver or pick up mail in the University Center",
  description: "Deliver or pick up mail in the University Center",
  reward: 5,
  state: "open",
  category: FALLBACK,
  opensAt: new Date(0).toISOString(),
};

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
