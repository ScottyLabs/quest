export interface Cleared {
  id: string;
  name: string;
  description: string;
  reward: number;
  place: number | null;
}

export const celebration = $state<{ current: Cleared | null }>({ current: null });

export function celebrate(cleared: Cleared): void {
  celebration.current = cleared;
}

export function closeCelebration(): void {
  celebration.current = null;
}
