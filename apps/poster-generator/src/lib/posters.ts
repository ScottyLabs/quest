const raw = import.meta.glob("./templates/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const TEMPLATES: Record<string, string> = Object.fromEntries(
  Object.entries(raw).map(([path, svg]) => [
    (path.split("/").pop() ?? path).replace(/\.svg$/u, ""),
    svg,
  ]),
);

export const PLACEHOLDERS = ["NAME", "CODE", "CATEGORY", "TAGLINE", "LOCATION", "DESCRIPTION"];

export const CODE_PATTERN = /^[0-9A-Z]{4}$/u;

const CODE_LENGTH = 4;
const CODE_SPACE = 36 ** CODE_LENGTH;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['\u2019\u02BC]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

export function templateFor(category: string): string | null {
  return TEMPLATES[slugify(category)] ?? null;
}

export function codeOk(code: string): boolean {
  return CODE_PATTERN.test(code);
}

export function cleanCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^0-9A-Z]/gu, "")
    .slice(0, CODE_LENGTH);
}

export function nextCode(taken: Iterable<string>): string {
  const used = new Set(taken);
  for (let value = 1; value < CODE_SPACE; value += 1) {
    const code = value.toString(36).toUpperCase().padStart(CODE_LENGTH, "0");
    if (!used.has(code)) return code;
  }
  throw new Error(`all ${CODE_SPACE - 1} codes are taken`);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

export function fill(svg: string, values: Record<string, string>): string {
  const lookup = new Map(Object.entries(values).map(([key, value]) => [key.toUpperCase(), value]));

  return svg.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/gu, (whole, key: string) => {
    const value = lookup.get(key.toUpperCase());
    return value === undefined ? whole : escapeXml(value);
  });
}

export function placeholdersIn(svg: string): string[] {
  const found = new Set<string>();
  for (const match of svg.matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/gu)) {
    const key = match[1];
    if (key !== undefined) found.add(key.toUpperCase());
  }
  return [...found];
}

export interface PageSize {
  width: number;
  height: number;
}

const UNITS: Record<string, number> = {
  "": 0.75,
  px: 0.75,
  pt: 1,
  pc: 12,
  in: 72,
  cm: 72 / 2.54,
  mm: 72 / 25.4,
  q: 72 / 25.4 / 4,
};

function toPoints(value: string): number | null {
  const match = /^\s*(-?[\d.]+)\s*([a-z%]*)\s*$/iu.exec(value);
  if (match === null) return null;

  const size = Number(match[1]);
  const unit = (match[2] ?? "").toLowerCase();
  const factor = UNITS[unit];
  if (!Number.isFinite(size) || factor === undefined) return null;

  return size * factor;
}

export function pageSize(svg: string): PageSize | null {
  const open = /<svg\b[^>]*>/iu.exec(svg);
  if (open === null) return null;
  const tag = open[0];

  const attr = (name: string): string | null =>
    new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "iu").exec(tag)?.[1] ??
    new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, "iu").exec(tag)?.[1] ??
    null;

  const width = attr("width");
  const height = attr("height");
  if (width !== null && height !== null) {
    const w = toPoints(width);
    const h = toPoints(height);
    if (w !== null && h !== null && w > 0 && h > 0) return { width: w, height: h };
  }

  const box = attr("viewBox")
    ?.trim()
    .split(/[\s,]+/u)
    .map(Number);
  if (box !== undefined && box.length === 4) {
    const [, , w, h] = box;
    if (w !== undefined && h !== undefined && w > 0 && h > 0) {
      return { width: w * UNITS.px!, height: h * UNITS.px! };
    }
  }

  return null;
}
