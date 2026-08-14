<script lang="ts">
  import CoinAmount from "../CoinAmount.svelte";
  import ItemThumb from "./ItemThumb.svelte";
  import RefundStepper from "./RefundStepper.svelte";
  import { TradeError, refund, type Purchase } from "$lib/trade.svelte";

  let { row, onclose, ondone }: { row: Purchase; onclose: () => void; ondone: () => void } =
    $props();

  const REASONS: Record<string, string> = {
    purchase_delivered: "This item is already delivered, so it can no longer be refunded.",
    quantity_too_large: "You do not have that many left to return.",
    purchase_not_found: "That purchase is no longer on your receipt.",
  };

  let picked = $state<number | null>(null);
  let busy = $state(false);
  let failed = $state<string | null>(null);

  const qty = $derived(picked ?? 1);
  const worth = $derived(row.cost * qty);
  const keep = $derived(row.quantity - qty);
  const reason = $derived(failed === null ? null : (REASONS[failed] ?? "Refund failed."));

  async function confirm() {
    if (row.delivered) {
      failed = "purchase_delivered";
      return;
    }

    busy = true;
    failed = null;
    try {
      await refund(row.id, qty);
      ondone();
    } catch (error) {
      failed = error instanceof TradeError ? error.code : "unknown";
      busy = false;
    }
  }
</script>

<div class="scrim" role="presentation" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="card"
    role="alertdialog"
    aria-modal="true"
    aria-label="Refund {row.name}"
    tabindex="-1"
    onclick={(event) => event.stopPropagation()}
  >
    <span class="thumb"><ItemThumb label={row.name} /></span>

    <div class="head">
      <img class="pencil" src="/img/trade/receipt-refund-pencil.svg" alt="" />
      <img class="word" src="/img/trade/receipt-refund-wordmark.svg" alt="Refund" />
    </div>

    <div class="body">
      <p class="item">
        <span class="what">{row.name}</span>
        <span class="count">x{row.quantity}</span>
      </p>

      <p class="money">
        <span>for</span>
        <CoinAmount amount={worth} size={46} before />
        <span>Scotty Coins</span>
      </p>

      <p class="keep">
        Keep <strong>x{keep} {row.name}</strong>
      </p>
    </div>

    <div class="pick">
      <RefundStepper value={qty} max={row.quantity} onchange={(next) => (picked = next)} />
    </div>

    {#if reason !== null}
      <p class="failed">{reason}</p>
    {/if}

    <div class="acts">
      <button class="act" type="button" disabled={busy} onclick={onclose}>
        <img class="chevron" src="/img/trade/receipt-back-chevron.svg" alt="" />
        Back
      </button>
      <button class="act" type="button" disabled={busy || row.delivered} onclick={confirm}>
        {busy ? "..." : "Confirm"}
      </button>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    z-index: 35;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(0 0 0 / 0.55);
    inset: 0;
  }

  .card {
    position: relative;
    width: calc(331.294 * var(--u));
    max-width: 100%;
    padding-bottom: calc(22.75 * var(--u));
    border-radius: calc(20 * var(--u));
    background: var(--highlight);
  }

  .thumb {
    position: absolute;
    top: calc(-12.29 * var(--u));
    left: calc(-27.21 * var(--u));
  }

  .head {
    display: flex;
    align-items: center;
    height: calc(92.835 * var(--u));
    margin-top: calc(-4.55 * var(--u));
    margin-left: calc(70.08 * var(--u));
  }

  .pencil {
    display: block;
    flex: none;
    width: calc(45.67 * var(--u));
    height: calc(47.4 * var(--u));
    margin: 0 calc(7.5 * var(--u));
  }

  .word {
    display: block;
    flex: none;
    width: calc(242 * var(--u));
    height: calc(62 * var(--u));
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: calc(12 * var(--u));
    margin-top: calc(6 * var(--u));
    padding: 0 calc(15 * var(--u)) 0 calc(15.57 * var(--u));
  }

  .item {
    display: flex;
    gap: calc(10 * var(--u));
    align-items: baseline;
    margin: 0;
    font-size: calc(32 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.64 * var(--u));
    line-height: 1.059;
  }

  .what {
    display: -webkit-box;
    min-width: 0;
    overflow: hidden;
    color: var(--secondary);
    -webkit-box-orient: vertical;
    line-clamp: 2;
    -webkit-line-clamp: 2;
  }

  .count {
    flex: none;
    color: var(--accent);
  }

  .money {
    display: flex;
    flex-wrap: wrap;
    gap: calc(7 * var(--u));
    align-items: center;
    margin: 0;
    color: var(--tertiary);
    font-size: calc(20 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.4 * var(--u));
    line-height: 1.059;
  }

  .money :global(.coin) {
    gap: calc(7 * var(--u));
  }

  .money :global(.coin .value) {
    color: var(--secondary);
    font-size: calc(44 * var(--u));
    font-stretch: 75%;
    font-style: italic;
    font-weight: 700;
    letter-spacing: calc(0.96 * var(--u));
    line-height: 1.059;
  }

  .keep {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    color: var(--tertiary);
    font-size: calc(20 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.4 * var(--u));
    line-height: 1.059;
    -webkit-box-orient: vertical;
    line-clamp: 2;
    -webkit-line-clamp: 2;
  }

  .keep strong {
    color: var(--accent);
    font-weight: 800;
  }

  .pick {
    width: calc(301 * var(--u));
    margin: calc(24 * var(--u)) 0 0 calc(16.04 * var(--u));
  }

  .failed {
    margin: calc(10 * var(--u)) calc(16.04 * var(--u)) 0;
    color: var(--accent);
    font-size: calc(13 * var(--u));
    font-weight: 700;
    line-height: 1.4;
    text-align: center;
  }

  .acts {
    display: flex;
    justify-content: space-between;
    margin-top: calc(15.5 * var(--u));
    padding: 0 calc(12.56 * var(--u)) 0 calc(17.47 * var(--u));
  }

  .act {
    display: flex;
    gap: calc(8 * var(--u));
    align-items: center;
    justify-content: center;
    width: calc(132.882 * var(--u));
    height: calc(43.687 * var(--u));
    border: 0;
    border-radius: calc(24 * var(--u));
    background: var(--accent);
    box-shadow: 0 calc(4.55 * var(--u)) 0 var(--band);
    color: var(--highlight);
    font: inherit;
    font-size: calc(16 * var(--u));
    font-weight: 700;
    cursor: pointer;
  }

  .act:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .act:not(:disabled):active {
    box-shadow: 0 0 0 var(--band);
    translate: 0 calc(4.55 * var(--u));
  }

  .chevron {
    display: block;
    flex: none;
    width: calc(13.25 * var(--u));
    height: calc(22.25 * var(--u));
  }
</style>
