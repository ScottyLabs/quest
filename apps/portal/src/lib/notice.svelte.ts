export type Tone = "info" | "good" | "bad";

export const notice = $state<{ current: { text: string; tone: Tone } | null }>({ current: null });

let timer: ReturnType<typeof setTimeout> | undefined;

export function announce(text: string, tone: Tone = "info", ms = 6000): void {
  clearTimeout(timer);
  notice.current = { text, tone };
  timer = setTimeout(() => {
    notice.current = null;
  }, ms);
}

export function dismiss(): void {
  clearTimeout(timer);
  notice.current = null;
}
