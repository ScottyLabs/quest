<script lang="ts">
  import {
      purchase,
      TradeError,
      type Answer,
      type Bought,
      type ItemOption,
      type Offer,
  } from "$lib/trade.svelte";
  import { SvelteMap } from "svelte/reactivity";
  import CostPanel from "./CostPanel.svelte";
  import ItemSummary from "./ItemSummary.svelte";
  import OptionField from "./OptionField.svelte";
  let {
    offer,
    balance,
    player,
    onclose,
    onbought,
  }: {
    offer: Offer;
    balance: number;
    player: boolean;
    onclose: () => void;
    onbought: (bought: Bought) => void;
  } = $props();

  const EXCUSES: Record<string, string> = {
    quantity_invalid: "Pick a quantity between 1 and the stock left.",
    item_unknown: "This item is no longer listed.",
    out_of_stock: "Someone beat you to it! Not enough stock left.",
    insufficient_coins: "You do not have enough ScottyCoins for this.",
    purchase_body_invalid: "That request could not be read. Try again.",
    option_missing: "Answer every required choice before purchasing.",
    option_answer_invalid: "One of your choices is no longer offered. Pick again.",
    option_answer_too_long: "Keep that answer to 120 characters or fewer.",
    option_unknown: "This item's choices just changed. Close and open it again.",
    option_id_invalid: "This item's choices just changed. Close and open it again.",
    not_a_player: "You are not a first year! No prizes for you >:D"
  };

  const answers = new SvelteMap<string, string>();
  let quantity = $state(1);
  let busy = $state(false);
  let failed = $state<string | null>(null);
  let scroller = $state<HTMLElement | null>(null);
  let roof = $state(0);
  let lift = $state(0);

  const gone = $derived(offer.stock <= 0);
  const total = $derived(offer.cost * quantity);
  const remaining = $derived(balance - total);
  const short = $derived(remaining < 0);

  // TEMP JUST FOR MAINTENANCE
  const SHOP_OPEN = false;

  const blocked = $derived(!SHOP_OPEN || !player);

  const picks = $derived(
    offer.options
      .map((option: ItemOption): Answer => ({
        option_id: option.id,
        value: (answers.get(option.id) ?? "").trim(),
      }))
      .filter((pick: Answer) => pick.value !== ""),
  );

  const unanswered = $derived(
    offer.options.filter(
      (option: ItemOption) => option.required && (answers.get(option.id) ?? "").trim() === "",
    ),
  );

  const nagging = $derived.by(() => {
    const labels = unanswered.map((option: ItemOption) => option.label);
    const last = labels.pop();

    if (last === undefined) return null;

    return labels.length === 0
      ? `Choose ${last} first.`
      : `Choose ${labels.join(", ")} and ${last} first.`;
  });

  const inset = $derived(roof + lift);

  $effect(() => {
    const view = window.visualViewport;
    if (view === null) return;

    const sync = (): void => {
      roof = Math.max(0, view.offsetTop);
      lift = Math.max(0, document.documentElement.clientHeight - view.height - view.offsetTop);
    };

    sync();
    view.addEventListener("resize", sync);
    view.addEventListener("scroll", sync);

    return () => {
      view.removeEventListener("resize", sync);
      view.removeEventListener("scroll", sync);
    };
  });

  $effect(() => {
    if (inset === 0) return;

    const focused = document.activeElement;
    if (focused instanceof HTMLElement && scroller !== null && scroller.contains(focused)) {
      focused.scrollIntoView({ block: "nearest" });
    }
  });

  async function buy(): Promise<void> {
    if (busy || blocked || gone || short || nagging !== null) {
      return;
    }

    busy = true;
    failed = null;
    try {
      onbought(await purchase(offer.id, quantity, picks));
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

<div class="scrim" role="presentation" onclick={onclose}></div>

<div class="stack" style:--roof="{roof}px" style:--lift="{lift}px">
  <div class="hero">
    <span class="plate"></span>
    {#if offer.backdrop !== null}
      <img class="shot" src={offer.backdrop} alt="" />
    {/if}

    <div class="badge" style:--shade={offer.shade}>
      {#if offer.art === null}
        <span class="blank"></span>
      {:else}
        <span class="cast"></span>
        <img class="glyph" src={offer.art} alt="" />
      {/if}
    </div>
  </div>

  <div class="sheet" role="dialog" aria-modal="true" aria-label={offer.name} tabindex="-1">
    <div class="scroll" bind:this={scroller}>
      <ItemSummary {offer} />

      <div class="choices">
        <div class="pickers">
          {#each offer.options as option (option.id)}
            <OptionField
              {option}
              value={answers.get(option.id) ?? ""}
              onpick={(next) => {
                answers.set(option.id, next);
                failed = null;
              }}
            />
          {/each}

          <div class="tally">
            <div class="notes">
              {#if !SHOP_OPEN}
                <p>Terrier Trade is currently down for repairs!</p>
              {:else if blocked}
                <p>Not a First Year!</p>
              {:else if gone}
                <p>Not Enough Stock</p>
              {:else if short}
                <p>Not Enough Scotty Coins</p>
              {:else if nagging !== null}
                <p>{nagging}</p>
              {/if}
              {#if failed !== null}
                <p>{failed}</p>
              {/if}
            </div>
          </div>
        </div>

        <CostPanel {total} {remaining} />
      </div>
    </div>

    <div class="actions">
      <button class="cancel" type="button" onclick={onclose}>Cancel</button>

      <button
        class="buy"
        type="button"
        disabled={blocked || gone || short || busy || nagging !== null}
        onclick={buy}
      >
        {busy ? "Purchasing..." : "Purchase"}
      </button>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    z-index: 35;
    inset: 0;
    background: rgb(0 0 0 / 0.56);
  }

  .stack {
    position: fixed;
    top: calc(var(--roof, 0px) + 24 * var(--u));
    bottom: max(var(--dock-clear), calc(var(--lift, 0px) + 12 * var(--u)));
    left: 50%;
    z-index: 36;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: calc(388 * var(--u));
    max-width: calc(100% - 24 * var(--u));
    transform: translateX(-50%);
    pointer-events: none;
  }

  .hero {
    position: relative;
    flex: none;
    height: calc(224.156 * var(--u));
    pointer-events: auto;
  }

  .plate {
    position: absolute;
    inset: 0;
    display: block;
    border-radius: calc(26 * var(--u)) calc(26 * var(--u)) 0 0;
    background: var(--tertiary-normal);
  }

  .shot {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    width: 100%;
    height: calc(142 * var(--u));
    border-radius: calc(26 * var(--u)) calc(26 * var(--u)) 0 0;
    object-fit: contain;
    object-position: top center;
  }

  .badge {
    position: absolute;
    top: calc(89 * var(--u));
    right: calc(7.633 * var(--u));
    z-index: 2;
    display: grid;
    width: calc(124.338 * var(--u));
    height: calc(106.454 * var(--u));
    place-items: center;
    pointer-events: none;
  }

  .cast,
  .glyph,
  .blank {
    position: relative;
    grid-area: 1 / 1;
    display: block;
  }

  .cast,
  .blank {
    z-index: 0;
    width: calc(91.785 * var(--u));
    height: calc(86.263 * var(--u));
    border-radius: calc(12 * var(--u));
  }

  .cast {
    background: var(--shade, var(--trade-after));
    transform: translate(calc(11 * var(--u)), calc(18 * var(--u))) rotate(-6.69deg)
      skewX(3.13deg);
  }

  .blank {
    background: var(--tertiary-normal);
    transform: rotate(-6.69deg) skewX(3.13deg);
  }

  .glyph {
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .sheet {
    position: relative;
    z-index: 1;
    display: flex;
    flex: 0 100 auto;
    flex-direction: column;
    gap: calc(17 * var(--u));
    min-height: 0;
    margin-top: calc(-82.156 * var(--u));
    padding: calc(18 * var(--u)) calc(18 * var(--u)) calc(21 * var(--u));
    border-radius: calc(20 * var(--u));
    background: var(--highlight);
    pointer-events: auto;
  }

  .scroll {
    display: flex;
    flex-direction: column;
    gap: calc(24 * var(--u));
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
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
    color: var(--primary);
    font-size: calc(13 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.26 * var(--u));
  }

  .actions {
    display: flex;
    flex: none;
    gap: calc(8 * var(--u));
    width: 100%;
  }

  .cancel,
  .buy {
    flex: 0 1 calc(172 * var(--u));
    min-width: 0;
    height: calc(48 * var(--u));
    padding: 0;
    border: 0;
    border-radius: calc(24 * var(--u));
    font: inherit;
    font-size: calc(16 * var(--u));
    font-weight: 700;
    line-height: calc(24 * var(--u));
    cursor: pointer;
  }

  .cancel {
    border: calc(2 * var(--u)) solid var(--trade-after);
    background: var(--highlight);
    color: var(--trade-after);
    filter: drop-shadow(0 calc(4 * var(--u)) 0 var(--trade-after));
  }

  .buy {
    background: var(--primary);
    color: var(--highlight);
    filter: drop-shadow(0 calc(4 * var(--u)) 0 var(--trade-buy-shade));
  }

  .buy:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .cancel:active,
  .buy:not(:disabled):active {
    filter: brightness(0.94);
  }
</style>
