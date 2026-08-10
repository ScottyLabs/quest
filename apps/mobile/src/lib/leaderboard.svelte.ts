import { api } from "$lib/api/client";
import type { components } from "$lib/api/schema";
import { Resource } from "$lib/cache.svelte";
import { MASCOTS, type Mascot } from "$lib/mascots";

export type Metric = "gems" | "coins";

export type Cup = components["schemas"]["Cup"];

export type You = Omit<components["schemas"]["You"], "community"> & {
  community: string | null;
};

export type Standing = Omit<components["schemas"]["Row"], "community"> & {
  community: string | null;
};

export type Board = Omit<components["schemas"]["Standings"], "metric" | "cup" | "you" | "rows"> & {
  metric: Metric;
  cup: Cup | null;
  you: You | null;
  rows: Standing[];
};

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
      const { data, response } = await api.GET("/api/leaderboard", {
        params: { query: { metric: id } },
      });
      if (!response.ok) throw new Error(`leaderboard responded ${response.status}`);

      const body = data as Board | undefined;

      return {
        metric: body?.metric ?? id,
        cup: body?.cup ?? null,
        you: body?.you ?? null,
        rows: body?.rows ?? [],
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
