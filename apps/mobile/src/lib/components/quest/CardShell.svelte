<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    surface,
    edge,
    label,
    onclick,
    children,
  }: {
    surface: string;
    edge: string;
    label?: string;
    onclick?: () => void;
    children: Snippet;
  } = $props();
</script>

<div class="stack" style:--surface={surface} style:--edge={edge}>
  <span class="edge" aria-hidden="true"></span>

  {#if onclick}
    <button class="face" type="button" aria-label={label} onclick={() => onclick?.()}>
      {@render children()}
    </button>
  {:else}
    <div class="face">{@render children()}</div>
  {/if}
</div>

<style>
  .stack {
    position: relative;
  }

  .edge {
    position: absolute;
    inset: calc(7 * var(--u)) 0 calc(-7 * var(--u));
    border-radius: calc(20 * var(--u));
    background: var(--edge);
  }

  .face {
    position: relative;
    display: flex;
    align-items: center;
    gap: calc(14 * var(--u));
    width: 100%;
    min-height: calc(87 * var(--u));
    padding: 0 calc(10 * var(--u)) 0 calc(18 * var(--u));
    border: 0;
    border-radius: calc(20 * var(--u));
    background: var(--surface);
    color: inherit;
    font: inherit;
    text-align: left;
  }

  button.face {
    cursor: pointer;
  }

  button.face:active {
    filter: brightness(0.96);
  }
</style>
