import doc from "./data/badges.json" with { type: "json" };

export type Metric = "challenges" | "category" | "gems";

export interface Badge {
  id: string;
  name: string;
  detail: string;
  art: string;
  locked: string;
  at?: number | "all";
  category?: string;
}

export interface BadgeRow {
  id: string;
  label: string;
  metric: Metric;
  badges: Badge[];
}

export interface Progress {
  challenges: number;
  total: number;
  gems: number;
  finished: Set<string>;
}

export const BADGE_ROWS: BadgeRow[] = doc.rows as BadgeRow[];

export function held(row: BadgeRow, badge: Badge, progress: Progress): boolean {
  if (row.metric === "category") {
    return badge.category !== undefined && progress.finished.has(badge.category);
  }

  const need = badge.at;
  if (need === undefined) return false;
  if (need === "all") return progress.total > 0 && progress.challenges >= progress.total;

  return (row.metric === "gems" ? progress.gems : progress.challenges) >= need;
}
