<script lang="ts">
  import { fade } from "svelte/transition";
  import { SHARED } from "$lib/theme";

  let { text, onclose }: { text: string; onclose: () => void } = $props();

  const DWELL = 4_000;

  const HIGHLIGHT = /<hi>(.*?)<\/hi>/g;

  function runs(source: string): { body: string; lit: boolean }[] {
    const out: { body: string; lit: boolean }[] = [];
    let at = 0;

    for (const found of source.matchAll(HIGHLIGHT)) {
      if (found.index > at) out.push({ body: source.slice(at, found.index), lit: false });
      out.push({ body: found[1] ?? "", lit: true });
      at = found.index + found[0].length;
    }

    if (at < source.length) out.push({ body: source.slice(at), lit: false });
    return out;
  }

  const pieces = $derived(runs(text));

  $effect(() => {
    const timer = setTimeout(onclose, DWELL);
    const go = () => onclose();

    window.addEventListener("pointerdown", go, { capture: true, once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", go, { capture: true });
    };
  });
</script>

<p class="hint" style:--gold={SHARED.coin} role="status" transition:fade={{ duration: 200 }}>
  &ldquo;{#each pieces as piece, i (i)}{#if piece.lit}<b>{piece.body}</b>{:else}{piece.body}{/if}{/each}&rdquo;<span
    class="sign">~Scotty</span
  >
</p>

<style>
  .hint {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 15;
    display: flow-root;
    min-height: calc(68 * var(--u));
    margin: 0;
    padding: calc(14 * var(--u)) calc(36 * var(--u)) calc(14 * var(--u)) calc(18 * var(--u));
    border-radius: 0 0 calc(8 * var(--u)) calc(8 * var(--u));
    background: rgb(27 27 29 / 0.96);
    color: var(--highlight);
    font-size: calc(15 * var(--u));
    font-weight: 700;
    line-height: calc(20 * var(--u));
    pointer-events: none;
  }

  b {
    color: var(--gold);
    font-weight: inherit;
  }

  .sign {
    float: right;
    margin-left: calc(12 * var(--u));
    font-weight: 600;
  }
</style>
