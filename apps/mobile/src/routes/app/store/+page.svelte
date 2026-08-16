<script lang="ts">
  import TradeShell from "$lib/components/trade/TradeShell.svelte";
  import ShopList from "$lib/components/trade/shop/ShopList.svelte";
  import ReceiptPanel from "$lib/components/trade/receipt/ReceiptPanel.svelte";
  import TicketPanel from "$lib/components/trade/ticket/TicketPanel.svelte";
  import { session } from "$lib/auth";
  import { offers, pickOffer, purchases, startRefund, tab } from "$lib/trade.svelte";
  import { refresh } from "$lib/wallet.svelte";

  const shelf = $derived(offers.data ?? []);
  const ledger = $derived(purchases.data ?? []);
  const name = $derived(session.user?.name ?? session.user?.andrewId ?? "");
  const andrewId = $derived(session.user?.andrewId ?? "");

  $effect(() => {
    void offers.ensure();
    void purchases.ensure();
    void refresh();
  });
</script>

<svelte:head><title>Terrier Trade - Orientation Quest</title></svelte:head>

<TradeShell>
  {#if tab.id === "shop"}
    {#if offers.data === null && offers.loading}
      <p class="note">Loading the shop&hellip;</p>
    {:else if offers.data === null && offers.error !== null}
      <p class="note">Couldn't reach the Orientation Quest server. Pull again in a moment.</p>
    {:else}
      <ShopList offers={shelf} onpick={pickOffer} />
    {/if}
  {:else if tab.id === "receipt"}
    <ReceiptPanel purchases={ledger} onrefund={startRefund} />
  {:else}
    <TicketPanel {name} {andrewId} />
  {/if}
</TradeShell>

<style>
  .note {
    max-width: var(--column);
    margin: calc(24 * var(--u)) auto;
    color: var(--tertiary);
    font-size: calc(14 * var(--u));
    font-weight: 600;
    text-align: center;
  }
</style>
