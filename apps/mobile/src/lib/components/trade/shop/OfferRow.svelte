<script lang="ts">
  import ItemTile from "../ItemTile.svelte";
  import PricePill from "./PricePill.svelte";
  import type { Offer } from "$lib/trade.svelte";

  let { offer, onpick }: { offer: Offer; onpick?: (offer: Offer) => void } = $props();

  const gone = $derived(offer.stock <= 0);
</script>

<button class="row" class:gone type="button" onclick={() => onpick?.(offer)}>
  <span class="thumb">
    <ItemTile art={offer.art} size={54.551} dimmed={gone} />
  </span>

  <span class="copy">
    <span class="name">{offer.name}</span>
    {#if gone}
      <span class="empty">No Items Left</span>
    {:else}
      <span class="left">Items left: <span class="count">{offer.stock}</span></span>
    {/if}
  </span>

  {#if !gone}
    <PricePill cost={offer.cost} />
  {/if}
</button>

<style>
  .row {
    display: flex;
    align-items: center;
    width: 100%;
    height: calc(87 * var(--u));
    padding: 0 calc(8.64 * var(--u)) 0 calc(18.21 * var(--u));
    border: 0;
    border-radius: calc(20 * var(--u));
    background: var(--highlight);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .row:active {
    filter: brightness(0.97);
  }

  .gone {
    background: var(--trade-sold);
  }

  .thumb {
    display: grid;
    flex: none;
    width: calc(61.811 * var(--u));
    height: calc(57.872 * var(--u));
    place-items: center;
  }

  .copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: calc(6 * var(--u));
    min-width: 0;
    margin-top: calc(7 * var(--u));
    margin-left: calc(12.98 * var(--u));
  }

  .name {
    overflow: hidden;
    color: var(--secondary);
    font-size: calc(16 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.32 * var(--u));
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .left {
    color: var(--tertiary);
    font-size: calc(13 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.26 * var(--u));
    line-height: 0.9021;
  }

  .count {
    font-size: calc(20 * var(--u));
  }

  .empty {
    color: var(--tertiary);
    font-size: calc(20 * var(--u));
    font-style: italic;
    font-weight: 600;
    font-stretch: 75%;
    letter-spacing: calc(0.26 * var(--u));
    line-height: 0.9021;
  }
</style>
