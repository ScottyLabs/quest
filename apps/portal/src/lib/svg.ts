const SVG_NS = "http://www.w3.org/2000/svg";

const HOLD =
  "position:absolute;left:-10000px;top:0;width:1024px;height:1024px;visibility:hidden;overflow:hidden;pointer-events:none";

function root(text: string): SVGSVGElement | null {
  const parsed = new DOMParser().parseFromString(text, "image/svg+xml");
  const found = parsed.documentElement as Element | null;

  if (found === null) return null;
  if (parsed.getElementsByTagName("parsererror").length > 0) return null;
  if (found.namespaceURI !== SVG_NS || found.localName !== "svg") return null;

  return found as SVGSVGElement;
}

function fit(live: SVGSVGElement): boolean {
  const box = live.getBBox();
  const parts = [box.x, box.y, box.width, box.height];

  if (!parts.every((part) => Number.isFinite(part))) return false;
  if (box.width <= 0 || box.height <= 0) return false;

  live.setAttribute("viewBox", parts.map((part) => Number(part.toFixed(3))).join(" "));
  live.setAttribute("preserveAspectRatio", "xMidYMid meet");
  live.removeAttribute("width");
  live.removeAttribute("height");

  return true;
}

export function normalizeSvgText(text: string): string | null {
  const source = root(text);

  if (source === null) return null;

  const hold = document.createElement("div");

  hold.setAttribute("style", HOLD);
  hold.setAttribute("aria-hidden", "true");
  document.body.append(hold);

  try {
    const live = document.importNode(source, true) as SVGSVGElement;

    hold.append(live);

    return fit(live) ? new XMLSerializer().serializeToString(live) : null;
  } catch {
    return null;
  } finally {
    hold.remove();
  }
}

export async function normalizeSvgFile(file: File): Promise<File | null> {
  try {
    const shaped = normalizeSvgText(await file.text());

    return shaped === null
      ? null
      : new File([shaped], file.name, { type: "image/svg+xml", lastModified: file.lastModified });
  } catch {
    return null;
  }
}
