<script lang="ts">
  import OfferRow from "./OfferRow.svelte";
  import type { Offer } from "$lib/trade.svelte";

  let { offers, onpick }: { offers: Offer[]; onpick: (offer: Offer) => void } = $props();
</script>

<ul class="list">
  {#each offers as offer (offer.id)}
    <li><OfferRow {offer} {onpick} /></li>
  {/each}
</ul>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: calc(10 * var(--u));
    margin: 0;
    padding: calc(10 * var(--u)) 0 0;
    list-style: none;
  }

  li {
    display: flex;
  }
</style>
