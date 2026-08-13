const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const DONE = "data-image-inlined";

interface Placement {
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function scaleOf(transform: string): { sx: number; sy: number; tx: number; ty: number } | null {
  const numbers = [...transform.matchAll(/-?\d*\.?\d+(?:e-?\d+)?/gu)].map((m) => Number(m[0]));

  if (transform.startsWith("matrix") && numbers.length >= 6) {
    return { sx: numbers[0] ?? 1, sy: numbers[3] ?? 1, tx: numbers[4] ?? 0, ty: numbers[5] ?? 0 };
  }
  if (transform.startsWith("scale") && numbers.length >= 1) {
    const sx = numbers[0] ?? 1;
    return { sx, sy: numbers[1] ?? sx, tx: 0, ty: 0 };
  }
  return null;
}

function placement(root: SVGSVGElement, pattern: Element, box: DOMRect): Placement | null {
  const use = pattern.querySelector("use");
  if (use === null) return null;

  const ref = (use.getAttribute("href") ?? use.getAttributeNS(XLINK_NS, "href") ?? "").slice(1);
  const image = root.querySelector(`image[id="${ref}"]`);
  if (image === null) return null;

  const href = image.getAttribute("href") ?? image.getAttributeNS(XLINK_NS, "href");
  const natural = {
    width: Number.parseFloat(image.getAttribute("width") ?? "0"),
    height: Number.parseFloat(image.getAttribute("height") ?? "0"),
  };
  if (href === null || natural.width === 0 || natural.height === 0) return null;

  const scale = scaleOf(use.getAttribute("transform") ?? "");
  if (scale === null) return null;

  return {
    href,
    x: box.x + scale.tx * box.width,
    y: box.y + scale.ty * box.height,
    width: natural.width * scale.sx * box.width,
    height: natural.height * scale.sy * box.height,
  };
}

/**
 * Paint pattern-filled shapes as plain clipped images.
 *
 * Figma wraps every bitmap in a pattern whose content maps 1:1 onto the tile.
 * svg2pdf turns that into a PDF tiling pattern, and because the mapping rounds a
 * hair short the tile repeats - bleeding a faint line of the image's opposite
 * edge, whose thickness changes with the viewer's zoom. A single <image> clipped
 * to the original shape draws identically with no tile to leak.
 */
export function inlineImages(root: SVGSVGElement): void {
  for (const shape of root.querySelectorAll(`[fill^="url(#pattern"]:not([${DONE}])`)) {
    shape.setAttribute(DONE, "");

    const id = /url\(#([^)]+)\)/u.exec(shape.getAttribute("fill") ?? "")?.[1];
    if (id === undefined) continue;

    const pattern = root.querySelector(`pattern[id="${id}"]`);
    if (pattern === null) continue;

    let box: DOMRect;
    try {
      box = (shape as SVGGraphicsElement).getBBox();
    } catch {
      continue;
    }

    const spot = placement(root, pattern, box);
    if (spot === null) continue;

    const clipId = `${id}-image-clip`;
    const clip = document.createElementNS(SVG_NS, "clipPath");
    clip.setAttribute("id", clipId);
    clip.setAttribute("clipPathUnits", "userSpaceOnUse");

    const outline = shape.cloneNode(false) as Element;
    for (const name of ["fill", "fill-opacity", "opacity", "style", DONE])
      outline.removeAttribute(name);
    clip.append(outline);
    (root.querySelector("defs") ?? root).append(clip);

    const image = document.createElementNS(SVG_NS, "image");
    image.setAttribute("href", spot.href);
    image.setAttributeNS(XLINK_NS, "xlink:href", spot.href);
    image.setAttribute("x", spot.x.toFixed(3));
    image.setAttribute("y", spot.y.toFixed(3));
    image.setAttribute("width", spot.width.toFixed(3));
    image.setAttribute("height", spot.height.toFixed(3));
    image.setAttribute("preserveAspectRatio", "none");

    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("clip-path", `url(#${clipId})`);
    group.append(image);

    const transform = shape.getAttribute("transform");
    if (transform !== null) group.setAttribute("transform", transform);

    shape.replaceWith(group);
  }
}
