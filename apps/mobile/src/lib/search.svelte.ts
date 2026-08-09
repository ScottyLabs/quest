import type { Quest } from "$lib/quests.svelte";

export const search = $state({ open: false, query: "" });

export function matches(quest: Quest, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;

  //TODO: make search better
  return (
    quest.title.toLowerCase().includes(needle) ||
    quest.detail.toLowerCase().includes(needle) ||
    quest.description.toLowerCase().includes(needle)
  );
}
