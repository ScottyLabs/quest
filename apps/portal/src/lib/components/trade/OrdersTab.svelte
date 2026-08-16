<script lang="ts">
  import { untrack } from "svelte";
  import type { OrderView } from "$lib/api/client";
  import { api, message, unwrap } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Chip from "$lib/components/Chip.svelte";
  import Empty from "$lib/components/Empty.svelte";
  import Field from "$lib/components/Field.svelte";
  import Panel from "$lib/components/Panel.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import RefundDialog from "$lib/components/trade/RefundDialog.svelte";
  import { announce } from "$lib/notice.svelte";

  type Filters = { andrew: string; delivered: boolean | null; limit: number };

  let {
    orders,
    loading,
    fault,
    filters,
    onfilters,
    onreload,
  }: {
    orders: OrderView[];
    loading: boolean;
    fault: string | null;
    filters: Filters;
    onfilters: (next: Filters) => void;
    onreload: () => void;
  } = $props();

  const LIMITS = [50, 100, 250, 500];

  let text = $state(untrack(() => filters.andrew));
  let busy = $state<number | null>(null);
  let refunding = $state<OrderView | null>(null);
  let timer: number | undefined;

  $effect(() => () => clearTimeout(timer));

  function typed(value: string): void {
    text = value;
    clearTimeout(timer);
    timer = setTimeout(() => {
      onfilters({ ...filters, andrew: value.trim() });
    }, 250) as unknown as number;
  }

  function readDelivered(value: string): boolean | null {
    if (value === "true") return true;

    return value === "false" ? false : null;
  }

  function handedOn(order: OrderView): string | null {
    return order.received_item_date ?? null;
  }

  async function deliver(order: OrderView, delivered: boolean): Promise<void> {
    busy = order.purchase_id;

    try {
      const done = await unwrap(
        await api.PUT("/api/portal/trade/orders/{purchase_id}/delivery", {
          params: { path: { purchase_id: order.purchase_id } },
          body: { delivered },
        }),
      );

      announce(
        delivered
          ? `${order.item} handed to ${order.andrew_id} on ${done.received_item_date ?? "today"}.`
          : `Handover undone for ${order.item} (${order.andrew_id}).`,
        "good",
      );
      onreload();
    } catch (error) {
      announce(message(error), "bad", 10000);
    } finally {
      busy = null;
    }
  }
</script>

<Panel
  title="Orders"
  detail="Every purchase on the books. Hand an order over once the student collects it; refunds are
    only possible while an order is still awaiting handover."
>
  {#snippet actions()}
    <Button size="small" tone="line" onclick={onreload} disabled={loading}>Refresh</Button>
  {/snippet}

  <div class="filters">
    <Field label="Andrew ID" hint="blank = everyone">
      <input
        type="text"
        value={text}
        spellcheck="false"
        placeholder="e.g. jdoe"
        oninput={(event) => typed(event.currentTarget.value)}
      />
    </Field>

    <Field label="Handover">
      <select
        value={filters.delivered === null ? "all" : String(filters.delivered)}
        onchange={(event) =>
          onfilters({ ...filters, delivered: readDelivered(event.currentTarget.value) })}
      >
        <option value="false">Awaiting handover</option>
        <option value="true">Delivered</option>
        <option value="all">All</option>
      </select>
    </Field>

    <Field label="Rows">
      <select
        value={String(filters.limit)}
        onchange={(event) =>
          onfilters({ ...filters, limit: Number(event.currentTarget.value) || 100 })}
      >
        {#each LIMITS as option (option)}
          <option value={String(option)}>{option}</option>
        {/each}
      </select>
    </Field>
  </div>

  {#if loading}
    <Spinner label="Loading orders" />
  {:else if fault !== null}
    <Empty title="Orders did not load" detail={fault} />
  {:else if orders.length === 0}
    <Empty
      title="No orders match"
      detail="Widen the handover filter or clear the Andrew ID to see more."
    />
  {:else}
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>Purchase</th>
            <th>Andrew ID</th>
            <th>Item</th>
            <th class="figure">Qty</th>
            <th class="figure">Unit</th>
            <th class="figure">Total</th>
            <th>Status</th>
            <th class="tail"></th>
          </tr>
        </thead>

        <tbody>
          {#each orders as order (order.purchase_id)}
            {@const date = handedOn(order)}
            <tr>
              <td class="id">{order.purchase_id}</td>
              <td>{order.andrew_id}</td>
              <td>
                {order.item}
                {#if order.options.length > 0}
                  <span class="picks">
                    {#each order.options as pick, index (index)}
                      <span class="pick">
                        <span class="key">{pick.label}</span>
                        <span class="val">{pick.value}</span>
                      </span>
                    {/each}
                  </span>
                {/if}
              </td>
              <td class="figure">{order.quantity}</td>
              <td class="figure">{order.cost}</td>
              <td class="figure strong">{order.cost * order.quantity}</td>
              <td>
                {#if date === null}
                  <Chip tone="warn">awaiting</Chip>
                {:else}
                  <Chip tone="good">delivered {date}</Chip>
                {/if}
              </td>
              <td class="tail">
                <div class="acts">
                  {#if date === null}
                    <Button
                      size="small"
                      onclick={() => deliver(order, true)}
                      busy={busy === order.purchase_id}
                    >
                      Hand over
                    </Button>
                    <Button
                      size="small"
                      tone="line"
                      onclick={() => (refunding = order)}
                      disabled={busy === order.purchase_id}
                    >
                      Refund
                    </Button>
                  {:else}
                    <Button
                      size="small"
                      tone="ghost"
                      onclick={() => deliver(order, false)}
                      busy={busy === order.purchase_id}
                    >
                      Undo handover
                    </Button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Panel>

{#if refunding !== null}
  <RefundDialog order={refunding} onclose={() => (refunding = null)} ondone={onreload} />
{/if}

<style>
  .filters {
    display: grid;
    gap: 12px;
    margin: 0 0 16px;
    grid-template-columns: minmax(10rem, 18rem) minmax(9rem, 12rem) minmax(6rem, 8rem);
  }

  .scroll {
    overflow: auto;
    max-width: 100%;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  th {
    padding: 8px 12px;
    border-bottom: 1px solid var(--line);
    background: var(--tertiary-normal);
    color: var(--ink-shade);
    font-size: 12px;
    font-weight: 800;
    text-align: left;
    white-space: nowrap;
  }

  td {
    padding: 7px 12px;
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
  }

  tbody tr:hover {
    background: var(--canvas);
  }

  .figure {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .strong {
    font-weight: 800;
  }

  .id {
    color: var(--tertiary);
    font-family: var(--mono);
    font-size: 12px;
  }

  .tail {
    width: 1%;
    text-align: right;
  }

  .acts {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  .picks {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }

  .pick {
    display: inline-flex;
    gap: 5px;
    align-items: baseline;
    max-width: 34ch;
    padding: 1px 8px;
    border-radius: var(--radius);
    background: var(--tertiary-normal);
    font-size: 11px;
    line-height: 1.6;
  }

  .key {
    flex: none;
    color: var(--tertiary);
  }

  .val {
    min-width: 0;
    color: var(--ink-shade);
    font-weight: 800;
    white-space: normal;
    overflow-wrap: anywhere;
  }
</style>
