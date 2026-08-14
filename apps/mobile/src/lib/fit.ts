const FLOOR = 9;

export function fit(node: HTMLElement, _text: string) {
  const run = () => {
    node.style.removeProperty("font-size");
    let size = Number.parseFloat(globalThis.getComputedStyle(node).fontSize);

    const spills = () => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const bounds = range.getBoundingClientRect();
      return bounds.width > node.clientWidth + 1 || bounds.height > node.clientHeight + 1;
    };

    while (size > FLOOR && spills()) {
      size -= 0.5;
      node.style.fontSize = `${size}px`;
    }
  };

  run();
  globalThis.addEventListener("resize", run);

  return {
    update: run,
    destroy: () => globalThis.removeEventListener("resize", run),
  };
}

/** Smallest share of the designed size the curved crest label may shrink to. */
const SQUEEZE = 0.5;

/** Keep the arc's ends clear so the text never touches the crest edges. */
const MARGIN = 0.94;

/**
 * Shrink a curved `<text>` until it fits its `<textPath>`. Glyphs that run past the
 * end of the path are simply not drawn, so a long house name would otherwise render
 * half a word. Labels that cannot fit even squeezed are hidden instead of clipped.
 */
export function arc(node: SVGTextElement, _text: string) {
  const run = () => {
    node.style.removeProperty("font-size");
    node.style.removeProperty("visibility");

    const target = node.querySelector("textPath");
    const href = target?.getAttribute("href") ?? "";
    const path = href.startsWith("#") ? node.ownerSVGElement?.querySelector(href) : null;
    if (!(path instanceof SVGPathElement)) return;

    const room = path.getTotalLength() * MARGIN;
    const width = node.getComputedTextLength();
    if (room === 0 || width === 0 || width <= room) return;

    const size = Number.parseFloat(globalThis.getComputedStyle(node).fontSize);
    if (room / width < SQUEEZE) {
      node.style.visibility = "hidden";
      return;
    }

    // glyph advances do not scale perfectly linearly, so settle it in a few passes
    let next = size * (room / width);
    for (let pass = 0; pass < 6; pass += 1) {
      node.style.fontSize = `${next}px`;
      if (node.getComputedTextLength() <= room) break;
      next *= 0.97;
    }

    if (next < size * SQUEEZE) node.style.visibility = "hidden";
  };

  run();
  void document.fonts.ready.then(run);
  globalThis.addEventListener("resize", run);

  return {
    update: run,
    destroy: () => globalThis.removeEventListener("resize", run),
  };
}
