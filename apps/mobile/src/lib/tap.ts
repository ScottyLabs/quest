import { goto } from "$app/navigation";
import { NEEDS_LOCATION, raise } from "$lib/caution.svelte";
import { celebrate } from "$lib/celebrate.svelte";
import { permitted } from "$lib/geo";
import { warn } from "$lib/notice.svelte";
import { CATEGORIES, quests, registerTap } from "$lib/quests.svelte";
import { FALLBACK } from "$lib/theme";
import { active } from "$lib/theme.svelte";
import { bank } from "$lib/wallet.svelte";

const BOARD = "/app";

export async function handleTap(url: string): Promise<void> {
  if (!(await permitted())) {
    raise(NEEDS_LOCATION);
    return;
  }

  const result = await registerTap(url);
  const landed = result.challenge;

  bank(result.current_scottycoins, result.current_thistlestones);

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
  } else {
    celebrate({
      id: landed.id,
      name: landed.name,
      description: landed.description || landed.tagline,
      reward: landed.coin_value,
      place: result.place,
    });
  }

  await quests.reload();
}
