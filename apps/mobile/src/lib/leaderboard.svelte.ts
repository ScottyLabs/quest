import { authFetch } from "$lib/auth";
import { Resource } from "$lib/cache.svelte";
import { MASCOTS, type Mascot } from "$lib/mascots";

export type Metric = "gems" | "coins";

export interface Cup {
  community: string;
  earned: number;
  target: number;
  percent: number;
}

export interface You {
  rank: number;
  score: number;
  community: string | null;
}

export interface Standing {
  rank: number;
  name: string;
  community: string | null;
  score: number;
  you: boolean;
}

export interface Board {
  metric: Metric;
  cup: Cup | null;
  you: You | null;
  rows: Standing[];
}

export function mascotFor(community: string | null): Mascot | null {
  if (community === null) return null;

  const slug = Object.keys(MASCOTS).find((key) => MASCOTS[key]?.mascot.dorm === community);

  return slug === undefined ? null : (MASCOTS[slug]?.mascot ?? null);
}

export const metric = $state<{ id: Metric }>({ id: "gems" });

const TTL = 60 * 1000;

function board(id: Metric): Resource<Board> {
  return new Resource<Board>({
    key: `quest.cache.leaderboard.${id}`,
    ttl: TTL,
    load: async () => {
      const response = await authFetch(`/api/leaderboard?metric=${id}`);
      if (!response.ok) throw new Error(`leaderboard responded ${response.status}`);

      const body = (await response.json()) as Board;

      return {
        metric: body.metric ?? id,
        cup: body.cup ?? null,
        you: body.you ?? null,
        rows: body.rows ?? [],
      };
    },
    revive: (raw: unknown) => {
      if (typeof raw !== "object" || raw === null) return null;

      const cached = raw as Board;

      return Array.isArray(cached.rows) ? cached : null;
    },
  });
}

const BOARDS: Record<Metric, Resource<Board>> = {
  gems: board("gems"),
  coins: board("coins"),
};

export function boardFor(id: Metric): Resource<Board> {
  return BOARDS[id];
}

export function toggleMetric(): void {
  metric.id = metric.id === "gems" ? "coins" : "gems";
}
