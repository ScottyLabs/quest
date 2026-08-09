import tokens from "./themes.json" with { type: "json" };

export interface Mark {
  src: string;
  x: number;
  y: number;
  w: number;
}

export interface Theme {
  label: string;
  title: string | null;
  hint: string;
  mark: Mark | null;
  accent: string;
  crown: string;
  sink: string;
  veil: string;
  band: string;
  canvas: string;
  tint: string;
  rail: string[];
  shade: string | null;
  logo: string | null;
}

export const SHARED = tokens.shared;

export const THEMES: Record<string, Theme> = tokens.categories;

export const FALLBACK = "all";

export function theme(id: string): Theme {
  return THEMES[id] ?? THEMES[FALLBACK]!;
}

export function vars(found: Theme): string {
  return [
    `--accent:${found.accent}`,
    `--crown:${found.crown}`,
    `--sink:${found.sink}`,
    `--veil:${found.veil}`,
    `--band:${found.band}`,
    `--canvas:${found.canvas}`,
    `--tint:${found.tint}`,
    `--rail-top:${found.rail[0] ?? found.accent}`,
    `--rail-bottom:${found.rail[1] ?? found.sink}`,
    `--shade:${found.shade ?? found.sink}`,
  ].join(";");
}
