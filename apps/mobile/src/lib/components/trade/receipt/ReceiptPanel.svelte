<script lang="ts">
  import ReceiptSection from "./ReceiptSection.svelte";
  import type { Purchase } from "$lib/trade.svelte";

  let {
    purchases,
    onrefund,
  }: { purchases: Purchase[]; onrefund: (row: Purchase) => void } = $props();

  const bought = $derived(purchases.filter((row) => !row.delivered));
  const delivered = $derived(purchases.filter((row) => row.delivered));
</script>

<div class="receipt">
  <p class="caption">Bought items can be refunded, delivered can not!</p>

  {#if bought.length > 0}
    <div class="bought">
      <ReceiptSection title="Items Bought:" rows={bought} refundable {onrefund} />
    </div>
  {/if}

  {#if delivered.length > 0}
    <ReceiptSection title="Items Delivered:" rows={delivered} refundable={false} />
  {/if}

  {#if purchases.length === 0}
    <p class="empty">Nothing bought yet - head to the Shop tab.</p>
  {/if}
</div>

<style>
  .receipt {
    max-width: var(--column);
    margin-inline: auto;
    padding: calc(11 * var(--u)) calc(9.5 * var(--u)) 0;
  }

  .caption {
    margin: 0 0 calc(4 * var(--u));
    color: var(--secondary);
    font-size: calc(15 * var(--u));
    letter-spacing: calc(0.3 * var(--u));
  }

  .bought {
    margin-bottom: calc(11 * var(--u));
    padding-bottom: calc(23 * var(--u));
  }

  .empty {
    margin: calc(24 * var(--u)) 0 0;
    color: var(--tertiary);
    font-size: calc(15 * var(--u));
    letter-spacing: calc(0.3 * var(--u));
    text-align: center;
  }
</style>
