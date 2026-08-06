import tokens from "./themes.json" with { type: "json" };

export interface Theme {
  label: string;
  accent: string;
  shade: string | null;
  canvas: string | null;
  logo: string | null;
}

export const SHARED = tokens.shared;

export const THEMES: Record<string, Theme> = tokens.categories;

export const FALLBACK = "all";

export function theme(id: string): Theme {
  return THEMES[id] ?? THEMES[FALLBACK]!;
}

export function vars(found: Theme): string {
  const shade = found.shade ?? `color-mix(in srgb, ${found.accent} 72%, #000000)`;
  const canvas = found.canvas ?? `color-mix(in srgb, ${found.accent} 55%, #ffffff)`;

  return `--accent:${found.accent};--shade:${shade};--canvas:${canvas}`;
}
