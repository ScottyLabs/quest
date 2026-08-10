import { api } from "$lib/api/client";
import type { components } from "$lib/api/schema";

type Balances = components["schemas"]["Balances"];

export const DAILY_CLEARS = 10;

export const DAILY_BONUS = 5;

export const DAILY_GEMS = DAILY_CLEARS + DAILY_BONUS;

const ZONE = "America/New_York";

export function gemDay(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(at);

  const field = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  const day = new Date(`${field("year")}-${field("month")}-${field("day")}T00:00:00Z`);
  if (Number(field("hour")) % 24 < 12) day.setUTCDate(day.getUTCDate() - 1);

  return day.toISOString().slice(0, 10);
}

export const wallet = $state({ scottycoins: 0, gems: 0, lifetimeGems: 0 });

export function bank(scottycoins: number, gems: number): void {
  wallet.scottycoins = scottycoins;
  wallet.gems = gems;
}

async function read(day?: string): Promise<Balances | null> {
  try {
    const { data } = await api.GET("/api/users/me/tokens", { params: { query: { day } } });
    return data ?? null;
  } catch {
    return null;
  }
}

export async function refresh(): Promise<void> {
  const [lifetime, today] = await Promise.all([read(), read("today")]);

  if (lifetime !== null) {
    if (Number.isFinite(lifetime.scottycoins)) wallet.scottycoins = lifetime.scottycoins;
    if (Number.isFinite(lifetime.thistlestones)) wallet.lifetimeGems = lifetime.thistlestones;
  }

  if (today !== null && Number.isFinite(today.thistlestones)) {
    wallet.gems = today.thistlestones;
  }
}
