export interface Caution {
  title: string;
  body: string;
}

export const NEEDS_LOCATION: Caution = {
  title: "Location is off",
  body: "Scanning proves you were actually at the challenge, so Orientation Quest needs your location. Turn it on for CMU O-Quest in Settings, then try again.",
};

export const caution = $state<{ current: Caution | null }>({ current: null });

export function raise(next: Caution): void {
  caution.current = next;
}

export function hush(): void {
  caution.current = null;
}
