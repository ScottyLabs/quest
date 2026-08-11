import { api } from "$lib/api/client";
import type { components } from "$lib/api/schema";

export type Card = components["schemas"]["CardView"];

const KEY = "quest.staffmode";

const kept = typeof localStorage === "undefined" ? null : localStorage;

export const staffMode = $state<{ on: boolean }>({ on: kept?.getItem(KEY) === "on" });

export function setStaffMode(on: boolean): void {
  staffMode.on = on;
  kept?.setItem(KEY, on ? "on" : "off");
}

export const card = $state<{ current: Card | null; from: string | null }>({
  current: null,
  from: null,
});

export function closeCard(): void {
  card.current = null;
  card.from = null;
}

function reason(error: unknown, response: Response): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "error" in error &&
    typeof error.error === "string"
  ) {
    return error.error;
  }
  return `http_${response.status}`;
}

export async function readCard(url: string, from: string | null = null): Promise<Card> {
  const { data, error, response } = await api.POST("/api/staff/card", { body: { url } });
  if (!data) throw new Error(reason(error, response));

  card.from = from;
  card.current = data;
  return data;
}

export async function linkCard(cardId: string, challengeId: string): Promise<Card> {
  const { data, error, response } = await api.PUT("/api/staff/card/{card_id}/challenge", {
    params: { path: { card_id: cardId } },
    body: { challenge_id: challengeId },
  });
  if (!data) throw new Error(reason(error, response));

  card.current = data;
  return data;
}

export async function unlinkCard(cardId: string): Promise<Card> {
  const { data, error, response } = await api.DELETE("/api/staff/card/{card_id}/challenge", {
    params: { path: { card_id: cardId } },
  });
  if (!data) throw new Error(reason(error, response));

  card.current = data;
  return data;
}

export async function placeCard(cardId: string, lat: number, lon: number): Promise<Card> {
  const { data, error, response } = await api.PUT("/api/staff/card/{card_id}/location", {
    params: { path: { card_id: cardId } },
    body: { lat, lon },
  });
  if (!data) throw new Error(reason(error, response));

  card.current = data;
  return data;
}
