<script lang="ts">
  import TradeShell from "$lib/components/trade/TradeShell.svelte";
  import ItemSheet from "$lib/components/trade/shop/ItemSheet.svelte";
  import PurchasedDialog from "$lib/components/trade/shop/PurchasedDialog.svelte";
  import ShopList from "$lib/components/trade/shop/ShopList.svelte";
  import ReceiptPanel from "$lib/components/trade/receipt/ReceiptPanel.svelte";
  import RefundDialog from "$lib/components/trade/receipt/RefundDialog.svelte";
  import TicketPanel from "$lib/components/trade/ticket/TicketPanel.svelte";
  import { session } from "$lib/auth";
  import {
    offers,
    purchases,
    tab,
    type Bought,
    type Offer,
    type Purchase,
  } from "$lib/trade.svelte";
  import { refresh, wallet } from "$lib/wallet.svelte";

  let picked = $state<Offer | null>(null);
  let bought = $state<Bought | null>(null);
  let refunding = $state<Purchase | null>(null);

  const shelf = $derived(offers.data ?? []);
  const ledger = $derived(purchases.data ?? []);
  const name = $derived(session.user?.name ?? session.user?.andrewId ?? "");
  const andrewId = $derived(session.user?.andrewId ?? "");

  $effect(() => {
    void offers.ensure();
    void purchases.ensure();
    void refresh();
  });

  function settle(done: Bought) {
    picked = null;
    bought = done;
    void refresh();
  }
</script>

<svelte:head><title>Terrier Trade - Orientation Quest</title></svelte:head>

<TradeShell>
  {#if tab.id === "shop"}
    {#if offers.data === null && offers.loading}
      <p class="note">Loading the shop&hellip;</p>
    {:else if offers.data === null && offers.error !== null}
      <p class="note">Couldn't reach the Orientation Quest server. Pull again in a moment.</p>
    {:else}
      <ShopList offers={shelf} onpick={(offer) => (picked = offer)} />
    {/if}
  {:else if tab.id === "receipt"}
    <ReceiptPanel purchases={ledger} onrefund={(row) => (refunding = row)} />
  {:else}
    <TicketPanel {name} {andrewId} />
  {/if}
</TradeShell>

{#if picked}
  <ItemSheet
    offer={picked}
    balance={wallet.scottycoins}
    onclose={() => (picked = null)}
    onbought={settle}
  />
{/if}

{#if bought}
  <PurchasedDialog bought={bought} onclose={() => (bought = null)} />
{/if}

{#if refunding}
  <RefundDialog
    row={refunding}
    onclose={() => (refunding = null)}
    ondone={() => {
      refunding = null;
      void refresh();
    }}
  />
{/if}

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
