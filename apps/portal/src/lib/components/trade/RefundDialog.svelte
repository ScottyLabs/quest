<script lang="ts">
  import { untrack } from "svelte";
  import type { OrderView } from "$lib/api/client";
  import { api, message, unwrap } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Field from "$lib/components/Field.svelte";
  import { announce } from "$lib/notice.svelte";

  let {
    order,
    onclose,
    ondone,
  }: { order: OrderView; onclose: () => void; ondone: () => void } = $props();

  let quantity = $state<number | null>(untrack(() => order.quantity));
  let busy = $state(false);

  const wanted = $derived(
    Math.min(Math.max(Math.trunc(quantity ?? 1) || 1, 1), order.quantity),
  );
  const coins = $derived(order.cost * wanted);

  async function refund(): Promise<void> {
    busy = true;
    const payload: { andrew_id: string; quantity: number } = {
      andrew_id: order.andrew_id,
      quantity: wanted,
    };

    try {
      const gave = await unwrap(
        await api.POST("/api/portal/trade/orders/{purchase_id}/refund", {
          params: { path: { purchase_id: order.purchase_id } },
          body: payload,
        }),
      );

      announce(
        `Refunded ${gave.refunded} coins to ${order.andrew_id}.` +
          ` They now hold ${gave.scottycoins} ScottyCoins.`,
        "good",
        9000,
      );
      ondone();
      onclose();
    } catch (error) {
      announce(message(error), "bad", 10000);
    } finally {
      busy = false;
    }
  }
</script>

<Dialog title="Refund purchase {order.purchase_id}" {onclose}>
  <div class="form">
    <p class="lede">
      {order.andrew_id} bought {order.quantity} &times; {order.item} at {order.cost} coins each.
      Refunding returns the coins and puts the units back on the shelf.
    </p>

    {#if order.options.length > 0}
      <div class="picks">
        {#each order.options as pick, index (index)}
          <span class="pick">
            <span class="key">{pick.label}</span>
            <span class="val">{pick.value}</span>
          </span>
        {/each}
      </div>
    {/if}

    <Field label="Units to refund" hint="1 to {order.quantity}">
      <input type="number" min="1" max={order.quantity} step="1" bind:value={quantity} />
    </Field>

    <p class="total">
      <span>Coins returned</span>
      <strong>{coins}</strong>
    </p>
  </div>

  {#snippet actions()}
    <Button tone="ghost" onclick={onclose}>Cancel</Button>
    <Button tone="danger" onclick={refund} {busy}>Refund {wanted} of {order.quantity}</Button>
  {/snippet}
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .lede {
    margin: 0;
    color: var(--tertiary);
    font-size: 13px;
    line-height: 1.6;
  }

  .picks {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .pick {
    display: inline-flex;
    gap: 5px;
    align-items: baseline;
    max-width: 100%;
    padding: 3px 10px;
    border-radius: var(--radius);
    background: var(--tertiary-normal);
    font-size: 12px;
  }

  .key {
    flex: none;
    color: var(--tertiary);
  }

  .val {
    min-width: 0;
    color: var(--ink-shade);
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .total {
    display: flex;
    gap: 12px;
    align-items: baseline;
    justify-content: space-between;
    margin: 0;
    padding: 12px 14px;
    border-radius: var(--radius);
    background: var(--canvas);
  }

  .total span {
    color: var(--ink-shade);
    font-size: 12px;
    font-weight: 700;
  }

  .total strong {
    font-size: 20px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
</style>
