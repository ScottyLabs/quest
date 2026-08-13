import { parse } from "opentype.js";
import type { Font, Glyph, Path } from "opentype.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const DONE = "data-outlined";

interface FontFile {
  url: string;
  family: string;
  weight: number;
}

const FONT_FILES: readonly FontFile[] = [
  { url: "/fonts/Poppins-Regular.ttf", family: "poppins", weight: 400 },
  { url: "/fonts/Satoshi-Regular.otf", family: "satoshi", weight: 400 },
  { url: "/fonts/Satoshi-Medium.otf", family: "satoshi", weight: 500 },
  { url: "/fonts/Satoshi-Bold.otf", family: "satoshi", weight: 700 },
];

const loaded = new Map<string, Font>();

function key(family: string, weight: number): string {
  return `${family}:${weight}`;
}

export async function loadFonts(): Promise<void> {
  if (loaded.size > 0) return;

  await Promise.all(
    FONT_FILES.map(async (file) => {
      try {
        const response = await fetch(file.url);
        if (!response.ok) return;
        loaded.set(key(file.family, file.weight), parse(await response.arrayBuffer()));
      } catch {}
    }),
  );
}

function pick(family: string, weight: number): Font | null {
  const name = family.split(",")[0]?.trim().replace(/["']/gu, "").toLowerCase() ?? "";
  const exact = loaded.get(key(name, weight));
  if (exact !== undefined) return exact;

  for (const candidate of [700, 500, 400]) {
    const font = loaded.get(key(name, candidate));
    if (font !== undefined) return font;
  }
  return null;
}

interface Style {
  font: Font;
  size: number;
  tracking: number;
  fill: string;
  opacity: string | null;
  anchor: string;
}

function styleOf(element: SVGTextElement): Style | null {
  const computed = getComputedStyle(element);
  const weight = Number.parseInt(computed.fontWeight, 10);
  const font = pick(computed.fontFamily, Number.isFinite(weight) ? weight : 400);
  if (font === null) return null;

  const size = Number.parseFloat(computed.fontSize);
  const spacing = Number.parseFloat(computed.letterSpacing);

  return {
    font,
    size: Number.isFinite(size) ? size : 16,
    tracking: Number.isFinite(spacing) ? spacing : 0,
    fill: element.getAttribute("fill") ?? computed.fill ?? "black",
    opacity: element.getAttribute("fill-opacity"),
    anchor: computed.textAnchor === "" ? "start" : computed.textAnchor,
  };
}

function advance(style: Style, glyph: Glyph, next: Glyph | null): number {
  const scale = style.size / style.font.unitsPerEm;
  const raw = next === null ? 0 : style.font.getKerningValue(glyph, next);
  const kern = Number.isFinite(raw) ? raw : 0;
  return (glyph.advanceWidth ?? 0) * scale + kern * scale + style.tracking;
}

function runWidth(style: Style, glyphs: readonly Glyph[]): number {
  let total = 0;
  for (const [index, glyph] of glyphs.entries()) {
    total += advance(style, glyph, glyphs[index + 1] ?? null);
  }
  return total - style.tracking;
}

export function textWidth(
  text: string,
  family: string,
  weight: number,
  size: number,
): number | null {
  const font = pick(family, weight);
  if (font === null) return null;

  const style: Style = { font, size, tracking: 0, fill: "black", opacity: null, anchor: "start" };
  return runWidth(
    style,
    [...text].map((char) => font.charToGlyph(char)),
  );
}

function pathData(path: Path, digits = 2): string {
  const n = (value: number | undefined): string => (value ?? 0).toFixed(digits);
  let d = "";

  for (const command of path.commands) {
    if (command.type === "M") d += `M${n(command.x)} ${n(command.y)}`;
    else if (command.type === "L") d += `L${n(command.x)} ${n(command.y)}`;
    else if (command.type === "Q") {
      d += `Q${n(command.x1)} ${n(command.y1)} ${n(command.x)} ${n(command.y)}`;
    } else if (command.type === "C") {
      d +=
        `C${n(command.x1)} ${n(command.y1)} ${n(command.x2)} ${n(command.y2)}` +
        ` ${n(command.x)} ${n(command.y)}`;
    } else d += "Z";
  }

  return d;
}

function paint(style: Style, d: string): SVGPathElement {
  const node = document.createElementNS(SVG_NS, "path");
  node.setAttribute("d", d);
  node.setAttribute("fill", style.fill);
  if (style.opacity !== null) node.setAttribute("fill-opacity", style.opacity);
  return node;
}

function offsetFor(anchor: string, width: number): number {
  if (anchor === "middle") return -width / 2;
  if (anchor === "end") return -width;
  return 0;
}

function runPath(style: Style, glyphs: readonly Glyph[], startX: number, y: number): string | null {
  let d = "";
  let cursor = startX;

  for (const [index, glyph] of glyphs.entries()) {
    d += pathData(glyph.getPath(cursor, y, style.size));
    cursor += advance(style, glyph, glyphs[index + 1] ?? null);
  }

  return d.includes("NaN") ? null : d;
}

function outlineStraight(element: SVGTextElement, style: Style): SVGGElement | null {
  const group = document.createElementNS(SVG_NS, "g");
  const spans = element.querySelectorAll("tspan");
  const rows = spans.length === 0 ? [element] : [...spans];

  let cursorY = Number.parseFloat(element.getAttribute("y") ?? "0");
  let started = false;

  for (const row of rows) {
    const text = (row.textContent ?? "").trim();
    const x = Number.parseFloat(row.getAttribute("x") ?? element.getAttribute("x") ?? "0");
    const y = row.getAttribute("y");
    const dy = row.getAttribute("dy");

    if (y !== null) cursorY = Number.parseFloat(y);
    else if (dy !== null && started) cursorY += Number.parseFloat(dy);

    started = true;
    if (text === "") continue;

    const glyphs = [...text].map((char) => style.font.charToGlyph(char));
    const d = runPath(style, glyphs, x + offsetFor(style.anchor, runWidth(style, glyphs)), cursorY);
    if (d === null) return null;

    group.append(paint(style, d));
  }

  return group;
}

function outlineCurved(
  element: SVGTextElement,
  style: Style,
  path: SVGPathElement,
): SVGGElement | null {
  const group = document.createElementNS(SVG_NS, "g");
  const text = (element.textContent ?? "").trim();
  if (text === "") return group;

  const total = path.getTotalLength();
  const share = Number.parseFloat(element.getAttribute("data-curve-anchor") ?? "50");
  const centre = (total * (Number.isFinite(share) ? share : 50)) / 100;
  const glyphs = [...text].map((char) => style.font.charToGlyph(char));

  let cursor = centre - runWidth(style, glyphs) / 2;
  for (const [index, glyph] of glyphs.entries()) {
    const step = advance(style, glyph, glyphs[index + 1] ?? null);
    const at = Math.max(0, Math.min(total, cursor + step / 2));
    const point = path.getPointAtLength(at);

    const probe = Math.min(1, total / 1000);
    const before = path.getPointAtLength(Math.max(0, at - probe));
    const after = path.getPointAtLength(Math.min(total, at + probe));
    const angle = (Math.atan2(after.y - before.y, after.x - before.x) * 180) / Math.PI;

    const glyphWidth = ((glyph.advanceWidth ?? 0) * style.size) / style.font.unitsPerEm;
    const d = pathData(glyph.getPath(-glyphWidth / 2, 0, style.size));
    if (d.includes("NaN")) return null;

    const node = paint(style, d);
    node.setAttribute(
      "transform",
      `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${angle.toFixed(2)})`,
    );

    group.append(node);
    cursor += step;
  }

  return group;
}

export function outlineText(root: SVGSVGElement): void {
  for (const element of root.querySelectorAll<SVGTextElement>(`text:not([${DONE}])`)) {
    const style = styleOf(element);
    if (style === null) {
      element.setAttribute(DONE, "");
      continue;
    }

    const selector = element.getAttribute("data-curve");
    const guide = selector === null ? null : root.querySelector<SVGPathElement>(selector);
    const group =
      guide === null ? outlineStraight(element, style) : outlineCurved(element, style, guide);

    if (group === null) {
      element.setAttribute(DONE, "");
      continue;
    }
    group.setAttribute(DONE, "");
    const transform = element.getAttribute("transform");
    if (transform !== null) group.setAttribute("transform", transform);

    element.replaceWith(group);
  }
}
