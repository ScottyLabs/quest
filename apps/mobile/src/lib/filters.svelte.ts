import type { Quest } from "$lib/quests.svelte";

export type Bucket = "challenges" | "completed" | "locked";

export const filters = $state<Record<Bucket, boolean>>({
  challenges: true,
  completed: true,
  locked: true,
});

export const LABELS: Record<Bucket, string> = {
  challenges: "Challenges",
  completed: "Completed",
  locked: "Locked",
};

export function bucket(quest: Quest, now: number): Bucket {
  if (Date.parse(quest.opensAt) > now) return "locked";
  return quest.state === "done" ? "completed" : "challenges";
}
