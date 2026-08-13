const SVG_NS = "http://www.w3.org/2000/svg";
const DONE = "data-mask-flattened";

const PAINT_ATTRS = ["fill", "fill-opacity", "opacity", "stroke", "stroke-width", "style"];

function hardEdged(shape: Element): boolean {
  const fill = shape.getAttribute("fill");
  if (fill !== null && fill.startsWith("url(")) return false;

  for (const name of ["fill-opacity", "opacity"]) {
    const value = shape.getAttribute(name);
    if (value !== null && Number.parseFloat(value) < 1) return false;
  }

  return true;
}

export function flattenMasks(root: SVGSVGElement): void {
  for (const element of root.querySelectorAll(`[mask]:not([${DONE}])`)) {
    element.setAttribute(DONE, "");

    const id = /url\(#([^)]+)\)/u.exec(element.getAttribute("mask") ?? "")?.[1];
    if (id === undefined) continue;

    const mask = root.querySelector(`mask[id="${id}"]`);
    if (mask === null) continue;

    const shapes = [...mask.children];
    if (shapes.length === 0 || !shapes.every(hardEdged)) continue;

    const clip = document.createElementNS(SVG_NS, "clipPath");
    clip.setAttribute("id", `${id}-as-clip`);
    clip.setAttribute("clipPathUnits", "userSpaceOnUse");

    for (const shape of shapes) {
      const copy = shape.cloneNode(true) as Element;
      for (const name of PAINT_ATTRS) copy.removeAttribute(name);
      clip.append(copy);
    }

    (root.querySelector("defs") ?? root).append(clip);
    element.removeAttribute("mask");

    if (element.hasAttribute("clip-path")) {
      const wrapper = document.createElementNS(SVG_NS, "g");
      wrapper.setAttribute("clip-path", `url(#${id}-as-clip)`);
      element.replaceWith(wrapper);
      wrapper.append(element);
    } else {
      element.setAttribute("clip-path", `url(#${id}-as-clip)`);
    }
  }
}
