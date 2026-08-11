import { goto } from "$app/navigation";
import { NEEDS_LOCATION, raise } from "$lib/caution.svelte";
import { celebrate } from "$lib/celebrate.svelte";
import { permitted } from "$lib/geo";
import { NfcError, openSettings, readiness, scan } from "$lib/nfc";
import { warn } from "$lib/notice.svelte";
import { CATEGORIES, quests, type Registered, registerTap, TapError } from "$lib/quests.svelte";
import { closeScan, openScan, scanning } from "$lib/scanning.svelte";
import { readCard, staffMode } from "$lib/staff.svelte";
import { showTapFail } from "$lib/tapfail.svelte";
import { FALLBACK } from "$lib/theme";
import { active } from "$lib/theme.svelte";
import { bank } from "$lib/wallet.svelte";

const BOARD = "/app";

let starting = false;
let pending: string | null = null;
let origin: string | null = null;

export async function handleTap(url: string): Promise<void> {
  if (pending === url) return;
  pending = url;

  try {
    await register(url);
  } finally {
    pending = null;
  }
}

async function register(url: string): Promise<void> {
  if (staffMode.on) {
    try {
      await readCard(url, origin);
    } catch (error) {
      warn(error instanceof Error ? error.message : "Couldn't read that card.");
    }
    return;
  }

  if (!(await permitted())) {
    raise(NEEDS_LOCATION);
    return;
  }

  let result: Registered;
  try {
    result = await registerTap(url);
  } catch (error) {
    if (!(error instanceof TapError)) throw error;
    showTapFail(error.code, url);
    return;
  }

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

  celebrate({
    id: landed.id,
    name: landed.name,
    description: landed.description || landed.tagline,
    reward: landed.coin_value,
    place: result.place,
    repeat: !result.first,
  });

  await quests.reload();
}

export async function tapScan(
  label: string,
  previous: string | null = null,
  from: string | null = null,
): Promise<void> {
  if (starting || scanning.label !== null) return;
  starting = true;
  origin = from;

  try {
    const state = await readiness();

    if (state !== "ready") {
      if (previous !== null) {
        await handleTap(previous);
      } else if (state === "disabled") {
        warn("Turn on NFC to scan this challenge.");
        await openSettings();
      } else {
        warn("This phone can't scan NFC tags.");
      }
      return;
    }

    if (!(await permitted())) {
      raise(NEEDS_LOCATION);
      return;
    }

    const signal = openScan(label);

    try {
      const url = await scan(`Hold your phone near the ${label} tag`, signal);
      if (url !== null) await handleTap(url);
    } catch (error) {
      if (error instanceof NfcError) warn(error.message);
      else warn("Couldn't register that tap.");
    } finally {
      closeScan();
    }
  } finally {
    starting = false;
    origin = null;
  }
}
