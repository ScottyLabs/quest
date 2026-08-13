const DONE = "data-centred";

function box(element: Element): DOMRect | null {
  try {
    return (element as SVGGraphicsElement).getBBox();
  } catch {
    return null;
  }
}

function centreIn(element: SVGTextElement, top: number, bottom: number): number | null {
  const ink = box(element);
  if (ink === null || ink.height === 0) return null;

  const room = bottom - top;
  if (room <= 0) return null;

  return top + (room - ink.height) / 2 - ink.y;
}

function shift(element: SVGTextElement, by: number): void {
  const existing = element.getAttribute("transform");
  const move = `translate(0 ${by.toFixed(2)})`;
  element.setAttribute("transform", existing === null ? move : `${existing} ${move}`);
  element.setAttribute(DONE, "");
}

export function centreCardText(root: SVGSVGElement): void {
  const card = box(root.querySelector("#quest-card") ?? root);
  const badge = box(root.querySelector("#quest-badge") ?? root);
  if (card === null || badge === null) return;

  const name = root.querySelector<SVGTextElement>(`text[data-role="name"]:not([${DONE}])`);
  if (name !== null) {
    const by = centreIn(name, card.y, badge.y);
    if (by !== null) shift(name, by);
  }

  const caption = root.querySelector<SVGTextElement>(`text[data-role="caption"]:not([${DONE}])`);
  if (caption !== null) {
    const by = centreIn(caption, badge.y + badge.height, card.y + card.height);
    if (by !== null) shift(caption, by);
  }
}
