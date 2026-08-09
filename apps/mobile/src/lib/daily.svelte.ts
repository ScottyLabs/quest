import { gemDay } from "$lib/wallet.svelte";

const STAMP = "quest.briefing.seen";

export const briefing = $state({ open: false });

export function greet(): void {
  if (localStorage.getItem(STAMP) === gemDay()) return;

  briefing.open = true;
}

export function acknowledge(): void {
  briefing.open = false;
  localStorage.setItem(STAMP, gemDay());
}
