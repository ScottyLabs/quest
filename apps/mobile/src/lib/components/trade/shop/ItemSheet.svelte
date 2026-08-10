<script lang="ts">
  import CostPanel from "./CostPanel.svelte";
  import ItemSummary from "./ItemSummary.svelte";
  import SizePicker from "./SizePicker.svelte";
  import Stepper from "./Stepper.svelte";
  import { purchase, TradeError, type Bought, type Offer } from "$lib/trade.svelte";

  let {
    offer,
    balance,
    onclose,
    onbought,
    provider = "[insert org name]",
  }: {
    offer: Offer;
    balance: number;
    onclose: () => void;
    onbought: (bought: Bought) => void;
    provider?: string;
  } = $props();

  const SIZES = ["S", "M", "L"] as const;

  const EXCUSES: Record<string, string> = {
    quantity_invalid: "Pick a quantity between 1 and the stock left.",
    item_unknown: "This item is no longer listed.",
    out_of_stock: "Someone beat you to it! Not enough stock left.",
    insufficient_coins: "You do not have enough ScottyCoins for this.",
    purchase_body_invalid: "That request could not be read. Try again.",
  };

  let size = $state<string>(SIZES[0]);
  let quantity = $state(1);
  let busy = $state(false);
  let failed = $state<string | null>(null);

  const ceiling = $derived(Math.max(1, offer.stock));
  const total = $derived(offer.cost * quantity);
  const remaining = $derived(balance - total);
  const short = $derived(remaining < 0);

  async function buy(): Promise<void> {
    if (busy || short) {
      return;
    }

    busy = true;
    failed = null;
    try {
      onbought(await purchase(offer.id, quantity));
    } catch (error) {
      failed =
        error instanceof TradeError
          ? (EXCUSES[error.code] ?? "That purchase did not go through.")
          : "That purchase did not go through.";
    } finally {
      busy = false;
    }
  }
</script>

<div class="scrim" role="presentation" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="sheet"
    role="dialog"
    aria-modal="true"
    aria-label={offer.name}
    tabindex="-1"
    onclick={(event) => event.stopPropagation()}
  >
    <div class="head">
      <ItemSummary {offer} />

      <div class="about">
        <p class="caption">Description:</p>
        <p class="body">{offer.description}</p>
        <p class="by">Provided to you by {provider}</p>
      </div>
    </div>

    <div class="foot">
      <div class="choices">
        <div class="pickers">
          <div class="sizes">
            <p class="caption">Size:</p>
            <SizePicker sizes={SIZES} value={size} onpick={(next) => (size = next)} />
          </div>

          <div class="tally">
            <div class="notes">
              <p>Cost: {total} Scotty Coins</p>
              {#if short}
                <p>Not Enough Scotty Coins</p>
              {/if}
              {#if failed !== null}
                <p>{failed}</p>
              {/if}
            </div>

            <Stepper
              value={quantity}
              max={ceiling}
              onchange={(next) => {
                quantity = next;
                failed = null;
              }}
            />
          </div>
        </div>

        <CostPanel {total} {remaining} />
      </div>

      <button class="buy" type="button" disabled={short || busy} onclick={buy}>
        {busy ? "Purchasing…" : "Purchase"}
      </button>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 35;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(24 * var(--u));
    background: rgb(0 0 0 / 0.55);
  }

  .sheet {
    display: flex;
    flex-direction: column;
    gap: calc(24 * var(--u));
    width: calc(377 * var(--u));
    max-width: 100%;
    max-height: 100%;
    padding: calc(18 * var(--u)) calc(18 * var(--u)) calc(36 * var(--u));
    overflow-y: auto;
    border-radius: calc(20 * var(--u));
    background: var(--highlight);
  }

  .head {
    display: flex;
    flex-direction: column;
    gap: calc(21 * var(--u));
  }

  .about,
  .sizes {
    display: flex;
    flex-direction: column;
    gap: calc(3 * var(--u));
  }

  .caption {
    margin: 0;
    color: var(--tertiary);
    font-size: calc(15 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.3 * var(--u));
  }

  .body,
  .by {
    margin: 0;
    color: var(--muted);
    font-size: calc(13 * var(--u));
    letter-spacing: calc(0.26 * var(--u));
  }

  .by {
    margin-top: calc(13 * var(--u));
    font-weight: 700;
  }

  .foot {
    display: flex;
    flex-direction: column;
    gap: calc(33 * var(--u));
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: calc(16 * var(--u));
  }

  .pickers {
    display: flex;
    flex-direction: column;
    gap: calc(18 * var(--u));
  }

  .tally {
    display: flex;
    align-items: center;
    gap: calc(6 * var(--u));
    min-height: calc(45 * var(--u));
  }

  .notes {
    flex: 1;
    min-width: 0;
  }

  .notes p {
    margin: 0;
    color: var(--accent);
    font-size: calc(13 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.26 * var(--u));
  }

  .buy {
    height: calc(48 * var(--u));
    padding: calc(12 * var(--u)) calc(32 * var(--u));
    border: 0;
    border-radius: calc(24 * var(--u));
    background: var(--accent);
    color: var(--highlight);
    font: inherit;
    font-size: calc(16 * var(--u));
    font-weight: 700;
    line-height: calc(24 * var(--u));
    filter: drop-shadow(0 calc(4 * var(--u)) 0 #360101);
    cursor: pointer;
  }

  .buy:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .buy:not(:disabled):active {
    filter: brightness(0.94);
  }
</style>
