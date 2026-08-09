import { authFetch } from "$lib/auth";

interface Balances {
  scottycoins: number;
  thistlestones: number;
}

export const DAILY_CLEARS = 10;

export const DAILY_BONUS = 5;

export const DAILY_GEMS = DAILY_CLEARS + DAILY_BONUS;

export const wallet = $state({ scottycoins: 0, gems: 0 });

export function bank(scottycoins: number, gems: number): void {
  wallet.scottycoins = scottycoins;
  wallet.gems = gems;
}

async function read(scope: string): Promise<Balances | null> {
  const response = await authFetch(`/users/me/tokens${scope}`).catch(() => null);
  if (response === null || !response.ok) return null;

  return (await response.json().catch(() => null)) as Balances | null;
}

export async function refresh(): Promise<void> {
  const [lifetime, today] = await Promise.all([read(""), read("?day=today")]);

  if (lifetime !== null && Number.isFinite(lifetime.scottycoins)) {
    wallet.scottycoins = lifetime.scottycoins;
  }

  if (today !== null && Number.isFinite(today.thistlestones)) {
    wallet.gems = today.thistlestones;
  }
}
