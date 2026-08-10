<script lang="ts">
  import type { Offer } from "$lib/trade.svelte";

  let { offer }: { offer: Offer } = $props();
</script>

<div class="summary">
  <div class="copy">
    <p class="name">{offer.name}</p>
    <p class="meta">
      Cost: <span class="strong">{offer.cost} ScottyCoins</span><br />
      Items left: <span class="strong">{offer.stock}</span>
    </p>
  </div>

  {#if offer.art === null}
    <span class="thumb blank"></span>
  {:else}
    <img class="thumb" src={offer.art} alt="" />
  {/if}
</div>

<style>
  .summary {
    display: flex;
    align-items: center;
    gap: calc(17 * var(--u));
    width: 100%;
    height: calc(102 * var(--u));
    padding: calc(12 * var(--u)) calc(17 * var(--u));
    border-radius: calc(10 * var(--u));
    background: var(--highlight);
    filter: drop-shadow(0 0 calc(2 * var(--u)) rgb(0 0 0 / 0.25));
  }

  .copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: calc(4 * var(--u));
    min-width: 0;
  }

  .name {
    margin: 0;
    overflow: hidden;
    color: var(--secondary);
    font-size: calc(24 * var(--u));
    font-weight: 800;
    letter-spacing: calc(0.48 * var(--u));
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .meta {
    margin: 0;
    color: var(--tertiary);
    font-size: calc(13 * var(--u));
    letter-spacing: calc(0.26 * var(--u));
  }

  .strong {
    font-weight: 700;
  }

  .thumb {
    flex: none;
    width: calc(71 * var(--u));
    height: calc(65 * var(--u));
    border-radius: calc(5 * var(--u));
    object-fit: cover;
  }

  .blank {
    background: #9a1023;
  }
</style>
