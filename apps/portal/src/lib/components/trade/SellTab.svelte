<script lang="ts">
  import type { ShopItem } from "$lib/api/client";
  import { ApiError, api, message, unwrap } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Empty from "$lib/components/Empty.svelte";
  import Field from "$lib/components/Field.svelte";
  import Panel from "$lib/components/Panel.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { announce } from "$lib/notice.svelte";

  let {
    items,
    loading,
    fault,
    onbought,
  }: {
    items: ShopItem[];
    loading: boolean;
    fault: string | null;
    onbought: () => void;
  } = $props();

  const REASONS: Record<string, string> = {
    user_unknown: "No user with that Andrew ID.",
    item_unknown: "That item is no longer in the catalog.",
    out_of_stock: "There is not enough stock left for that quantity.",
    insufficient_coins: "They don't have enough ScottyCoins.",
    quantity_invalid: "That quantity is not a whole number of units.",
  };

  let andrew = $state("");
  let chosen = $state("");
  let quantity = $state<number | null>(1);
  let busy = $state(false);

  const picked = $derived(items.find((item) => item.id === chosen) ?? null);
  const ceiling = $derived(Math.max(picked?.stock ?? 1, 1));
  const wanted = $derived(Math.min(Math.max(Math.trunc(quantity ?? 1) || 1, 1), ceiling));
  const total = $derived((picked?.cost ?? 0) * wanted);
  const ready = $derived(
    andrew.trim().length > 0 && picked !== null && picked.stock > 0 && wanted <= picked.stock,
  );

  function reason(error: unknown): string {
    if (error instanceof ApiError) return REASONS[error.code] ?? message(error);

    return message(error);
  }

  async function sell(): Promise<void> {
    if (picked === null) return;

    busy = true;
    const payload: { andrew_id: string; item_id: string; quantity: number } = {
      andrew_id: andrew.trim(),
      item_id: picked.id,
      quantity: wanted,
    };

    try {
      const bought = await unwrap(await api.POST("/api/portal/trade/orders", { body: payload }));
      const sold = `${bought.quantity} \u00d7 ${bought.item}`;

      announce(
        `Sold ${sold} to ${payload.andrew_id} for ${bought.spent} coins.` +
          ` They have ${bought.scottycoins} ScottyCoins left.`,
        "good",
        9000,
      );
      quantity = 1;
      onbought();
    } catch (error) {
      announce(reason(error), "bad", 10000);
    } finally {
      busy = false;
    }
  }
</script>

<Panel
  title="Sell at the counter"
  detail="Runs the same purchase path the app uses, so stock and balances stay honest. The coins
    come out of the student's balance immediately."
>
  {#if loading}
    <Spinner label="Loading the catalog" />
  {:else if fault !== null}
    <Empty title="The catalog did not load" detail={fault} />
  {:else if items.length === 0}
    <Empty title="Nothing to sell" detail="Stock an item before running a purchase." />
  {:else}
    <div class="form">
      <Field label="Andrew ID" hint="the buyer">
        <input type="text" bind:value={andrew} spellcheck="false" placeholder="e.g. jdoe" />
      </Field>

      <Field label="Item">
        <select bind:value={chosen}>
          <option value="">Pick an item</option>
          {#each items as item (item.id)}
            <option value={item.id} disabled={item.stock <= 0}>
              {item.name} &mdash; {item.cost} coins ({item.stock} left)
            </option>
          {/each}
        </select>
      </Field>

      <Field label="Quantity" hint={picked === null ? "pick an item" : `max ${picked.stock}`}>
        <input type="number" min="1" max={ceiling} step="1" bind:value={quantity} />
      </Field>
    </div>

    <div class="close">
      <div class="total">
        <span class="label">Total</span>
        <strong><span class="coin" aria-hidden="true"></span>{total}</strong>
        <span class="sum">
          {#if picked === null}
            Pick an item to price this up.
          {:else}
            {wanted} &times; {picked.cost} coins
          {/if}
        </span>
      </div>

      <Button onclick={sell} disabled={!ready} {busy}>Run purchase</Button>
    </div>
  {/if}
</Panel>

<style>
  .form {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  }

  .close {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin: 18px 0 0;
    padding: 14px 16px;
    border-radius: var(--radius);
    background: var(--canvas);
  }

  .total {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .total .label {
    color: var(--ink-shade);
    font-size: 12px;
    font-weight: 700;
  }

  .total strong {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    font-size: 26px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .coin {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--coin);
  }

  .sum {
    color: var(--tertiary);
    font-size: 12px;
    font-weight: 400;
  }
</style>
