/**
 * One floating message at a time, rendered by `Toast.svelte` from the root
 * layout. Screens report failures here instead of rendering them inline: the
 * mascot rail and its Confirm button sit on measured marks, and an inline
 * message moves them.
 */
export const notice = $state<{ current: string | null }>({ current: null });

let timer: ReturnType<typeof setTimeout> | undefined;

export function warn(message: string, ms = 6000): void {
  clearTimeout(timer);
  notice.current = message;
  timer = setTimeout(() => {
    notice.current = null;
  }, ms);
}

export function dismiss(): void {
  clearTimeout(timer);
  notice.current = null;
}
