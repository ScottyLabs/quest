const STRAIGHT = 1.5;
const SLACK = 8;
const ENGAGE = 8;
const REACH = 0.34;
const RUBBER = 0.25;
const RESIST = 0.14;
const LEDGE = 0.08;
const FAR = 0.12;
const FLICK = 0.25;
const SMOOTH = 0.7;
const CRAWL = 1.4;
const BRIEF = 110;
const LONG = 220;

export const TAP_MS = 240;

export interface Origin {
  x: number;
  y: number;
  px: number;
  pt: number;
  vx: number;
}

export type Gesture = PointerEvent | TouchEvent;

function overlaid(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
}

function slides(target: EventTarget | null): boolean {
  let node = target instanceof Element ? target : null;

  while (node !== null) {
    const { overflowX } = getComputedStyle(node);
    const room = node.scrollWidth - node.clientWidth > SLACK;
    if (room && (overflowX === "auto" || overflowX === "scroll")) return true;
    node = node.parentElement;
  }

  return false;
}

function spot(event: Gesture): { x: number; y: number } | null {
  if ("changedTouches" in event) {
    if (event.touches.length > 1) return null;
    const touch = event.changedTouches[0] ?? event.touches[0] ?? null;
    return touch === null ? null : { x: touch.clientX, y: touch.clientY };
  }

  return event.isPrimary ? { x: event.clientX, y: event.clientY } : null;
}

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

export function swipeFrom(event: Gesture): Origin | null {
  const at = spot(event);
  if (at === null || overlaid() || slides(event.target)) return null;

  return { x: at.x, y: at.y, px: at.x, pt: event.timeStamp, vx: 0 };
}

export function swipeShift(from: Origin, event: Gesture): number | null {
  const at = spot(event);
  if (at === null) return null;

  const span = event.timeStamp - from.pt;
  if (span > 0) {
    const rate = (at.x - from.px) / span;
    from.vx = from.vx * (1 - SMOOTH) + rate * SMOOTH;
    from.px = at.x;
    from.pt = event.timeStamp;
  }

  const dx = at.x - from.x;
  const dy = at.y - from.y;
  if (Math.abs(dx) < ENGAGE || Math.abs(dx) < Math.abs(dy) * STRAIGHT) return null;

  return dx;
}

export function swipePeek(dx: number, open: boolean, width: number): number {
  if (!open) return clamp(dx * RESIST, width * LEDGE);

  const reach = width * REACH;
  const over = Math.abs(dx) - reach;
  const near = over <= 0 ? Math.abs(dx) : reach + over * RUBBER;

  return Math.sign(dx) * near;
}

export function swipeCommit(from: Origin, event: Gesture, width: number): number {
  const at = spot(event);
  if (at === null) return 0;

  const dx = at.x - from.x;
  if (dx === 0 || Math.abs(dx) < Math.abs(at.y - from.y) * STRAIGHT) return 0;

  const far = Math.abs(dx) >= width * FAR;
  const flicked = Math.abs(from.vx) >= FLICK && Math.sign(from.vx) === Math.sign(dx);
  if (!far && !flicked) return 0;

  return dx < 0 ? 1 : -1;
}

export function swipeGlide(distance: number, vx: number): number {
  const speed = Math.max(Math.abs(vx), CRAWL);

  return Math.round(Math.max(BRIEF, Math.min(LONG, distance / speed)));
}
