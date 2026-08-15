<script lang="ts">
  import type { Order, ShopItem, TableView } from "$lib/api/client";
  import { api, message, unwrap } from "$lib/api/client";
  import Empty from "$lib/components/Empty.svelte";
  import OrdersTab from "$lib/components/trade/OrdersTab.svelte";
  import PassTab from "$lib/components/trade/PassTab.svelte";
  import SellTab from "$lib/components/trade/SellTab.svelte";
  import StockTab from "$lib/components/trade/StockTab.svelte";
  import { me } from "$lib/identity.svelte";
  import { announce } from "$lib/notice.svelte";

  const TABS = [
    { id: "pass", label: "Pass" },
    { id: "stock", label: "Stock" },
    { id: "orders", label: "Orders" },
    { id: "sell", label: "Sell" },
  ] as const;

  type Tab = (typeof TABS)[number]["id"];

  type Filters = { andrew: string; delivered: boolean | null; limit: number };

  const allowed = $derived(me.can("trade_desk"));

  let tab = $state<Tab>("pass");

  let items = $state<ShopItem[]>([]);
  let itemsBusy = $state(true);
  let itemsFault = $state<string | null>(null);
  let itemsTable = $state<TableView | null>(null);

  let orders = $state<Order[]>([]);
  let ordersBusy = $state(true);
  let ordersFault = $state<string | null>(null);
  let filters = $state<Filters>({ andrew: "", delivered: false, limit: 100 });

  const query = $derived({
    andrew_id: filters.andrew === "" ? undefined : filters.andrew,
    delivered: filters.delivered ?? undefined,
    limit: filters.limit,
  });

  async function loadItems(): Promise<void> {
    itemsBusy = true;

    try {
      items = await unwrap(await api.GET("/api/portal/trade/items"));
      itemsFault = null;
    } catch (error) {
      itemsFault = message(error);
      announce(itemsFault, "bad");
    } finally {
      itemsBusy = false;
    }
  }

  async function loadTable(): Promise<void> {
    try {
      const tables = await unwrap(await api.GET("/api/portal/tables"));
      itemsTable = tables.find((view) => view.name === "items") ?? null;
    } catch (error) {
      announce(message(error), "bad");
    }
  }

  async function loadOrders(narrow: {
    andrew_id: string | undefined;
    delivered: boolean | undefined;
    limit: number;
  }): Promise<void> {
    ordersBusy = true;

    try {
      orders = await unwrap(
        await api.GET("/api/portal/trade/orders", { params: { query: narrow } }),
      );
      ordersFault = null;
    } catch (error) {
      ordersFault = message(error);
      announce(ordersFault, "bad");
    } finally {
      ordersBusy = false;
    }
  }

  $effect(() => {
    if (!allowed) return;

    void loadItems();

    if (me.allows("items", "edit")) void loadTable();
  });

  $effect(() => {
    if (!allowed) return;

    void loadOrders(query);
  });

  function sold(): void {
    void loadItems();
    void loadOrders(query);
  }
</script>

<header class="head">
  <h1>Terrier Trade</h1>
  <p>
    The shop desk: what is on the shelf, who is waiting on a handover, and purchases run on a
    student's behalf. Everything here goes through the same code the app uses, so stock and
    balances stay consistent.
  </p>
</header>

{#if !allowed}
  <Empty
    title="The trade desk is closed to you"
    detail="Terrier Trade needs the trade-admin group in Keycloak. Ask a team lead to add you, then
      sign in again."
  />
{:else}
  <nav class="tabs">
    {#each TABS as option (option.id)}
      <button
        type="button"
        class:on={tab === option.id}
        aria-current={tab === option.id ? "page" : undefined}
        onclick={() => (tab = option.id)}
      >
        {option.label}
      </button>
    {/each}
  </nav>

  {#if tab === "pass"}
    <PassTab onchanged={sold} />
  {:else if tab === "stock"}
    <StockTab
      {items}
      loading={itemsBusy}
      fault={itemsFault}
      table={itemsTable}
      onchanged={loadItems}
    />
  {:else if tab === "orders"}
    <OrdersTab
      {orders}
      loading={ordersBusy}
      fault={ordersFault}
      {filters}
      onfilters={(next) => (filters = next)}
      onreload={() => loadOrders(query)}
    />
  {:else}
    <SellTab {items} loading={itemsBusy} fault={itemsFault} onbought={sold} />
  {/if}
{/if}

<style>
  .head {
    max-width: 46rem;
    margin: 0 0 24px;
  }

  h1 {
    margin: 0 0 6px;
    font-size: 24px;
    font-weight: 800;
  }

  .head p {
    margin: 0;
    color: var(--tertiary);
    font-size: 13px;
    line-height: 1.6;
  }

  .tabs {
    display: inline-flex;
    gap: 4px;
    margin: 0 0 18px;
    padding: 4px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--highlight);
    box-shadow: var(--lift);
  }

  .tabs button {
    padding: 7px 18px;
    border: 0;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--tertiary);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .tabs button:hover:not(.on) {
    background: var(--tertiary-normal);
    color: var(--ink-shade);
  }

  .tabs button.on {
    background: var(--accent);
    color: var(--highlight);
  }
</style>
