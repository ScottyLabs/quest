import { goto } from "$app/navigation";
import { warn } from "$lib/notice.svelte";
import { CATEGORIES, quests, registerTap } from "$lib/quests.svelte";
import { FALLBACK } from "$lib/theme";
import { active } from "$lib/theme.svelte";

const BOARD = "/app";

export async function handleTap(url: string, expected?: string): Promise<void> {
  const result = await registerTap(url);
  const landed = result.challenge;
  if (
    active.id !== FALLBACK &&
    active.id !== landed.category &&
    CATEGORIES.includes(landed.category)
  ) {
    active.id = landed.category;
  }

  if (location.pathname !== BOARD) await goto(BOARD);

  if (!result.first) {
    warn(`That tag was "${landed.name}", already completed.`);
  } else if (expected !== undefined && landed.id !== expected) {
    warn(`That tag was "${landed.name}", counted it instead.`);
  } else if (expected === undefined) {
    warn(`Counted "${landed.name}".`);
  }

  await quests.reload();
}
