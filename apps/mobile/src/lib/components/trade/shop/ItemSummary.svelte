<script lang="ts">
  import type { Offer } from "$lib/trade.svelte";

  let {
  offer,
  stock,
}: {
  offer: Offer;
  stock?: number;
} = $props();

const shownStock = $derived(stock ?? offer.stock);
</script>

<div class="summary">
  <div class="well">
    <p class="name">{offer.name}</p>
    <p class="meta">Items left: <span class="count">{shownStock}</span></p>
  </div>

  <div class="about">
    <p class="caption">Description:</p>
    <p class="body">{offer.description}</p>
  </div>
</div>

<style>
  .summary {
    display: flex;
    flex-direction: column;
    gap: calc(24 * var(--u));
    width: calc(341 * var(--u));
    max-width: 100%;
    margin-inline: auto;
  }

  .well {
    display: flex;
    flex-direction: column;
    gap: calc(4 * var(--u));
    min-width: 0;
    padding: calc(12 * var(--u)) calc(17 * var(--u)) calc(11 * var(--u));
    border-radius: calc(10 * var(--u));
    background: var(--highlight);
    filter: drop-shadow(0 0 calc(2 * var(--u)) rgb(0 0 0 / 0.25));
  }

  .name {
    margin: 0;
    max-width: calc(240 * var(--u));
    color: var(--secondary);
    font-size: calc(24 * var(--u));
    font-weight: 800;
    line-height: calc(33.5 * var(--u));
    letter-spacing: calc(0.48 * var(--u));
    overflow-wrap: anywhere;
  }

  .meta {
    margin: 0;
    color: var(--tertiary);
    font-size: calc(13 * var(--u));
    font-weight: 400;
    line-height: calc(20.5 * var(--u));
    letter-spacing: calc(0.26 * var(--u));
  }

  .count {
    font-weight: 700;
  }

  .about {
    display: flex;
    flex-direction: column;
    gap: calc(3 * var(--u));
    min-width: 0;
  }

  .caption {
    margin: 0;
    color: var(--tertiary);
    font-size: calc(15 * var(--u));
    font-weight: 600;
    line-height: calc(20.5 * var(--u));
    letter-spacing: calc(0.3 * var(--u));
  }

  .body {
    margin: 0;
    color: var(--muted);
    font-size: calc(13 * var(--u));
    font-weight: 400;
    line-height: calc(18.5 * var(--u));
    letter-spacing: calc(0.26 * var(--u));
    overflow-wrap: anywhere;
  }
</style>
