<script lang="ts">
  import { api, message, unwrap, type Schemas } from "$lib/api/client";
  import { onMount } from "svelte";

  type SalesItemView = Schemas["SalesItemView"];

  let sales = $state<SalesItemView[]>([]);
  let loading = $state(true);
  let fault = $state<string | null>(null);
  let search = $state("");

  const shown = $derived.by(() => {
    const needle = search.trim().toLowerCase();
    if (needle === "") return sales;

    return sales.filter(
      (item) =>
        item.item.toLowerCase().includes(needle) ||
        item.options.some(
          (option) =>
            option.label.toLowerCase().includes(needle) ||
            option.value.toLowerCase().includes(needle),
        ),
    );
  });

  async function load(): Promise<void> {
    loading = true;

    try {
      sales = await unwrap(await api.GET("/api/portal/trade/sales"));
      fault = null;
    } catch (error) {
      fault = message(error);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void load();
  });
</script>

<div class="sales">
  <div class="bar">
    <input
      type="search"
      placeholder="Search item or option"
      bind:value={search}
    />

    <button type="button" onclick={() => void load()}>
      Refresh
    </button>
  </div>

  {#if loading}
    <p>Loading sales...</p>
  {:else if fault !== null}
    <p>{fault}</p>
  {:else if shown.length === 0}
    <p>No sales found.</p>
  {:else}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Total sold</th>
            <th>Option</th>
            <th>Value</th>
            <th>Sold</th>
          </tr>
        </thead>

        <tbody>
          {#each shown as item (item.item_id)}
            {#if item.options.length === 0}
              <tr>
                <td>{item.item}</td>
                <td>{item.sold}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
              </tr>
            {:else}
              {#each item.options as option}
                <tr>
                  <td>{item.item}</td>
                  <td>{item.sold}</td>
                  <td>{option.label}</td>
                  <td>{option.value}</td>
                  <td>{option.sold}</td>
                </tr>
              {/each}
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .sales {
    display: grid;
    gap: 16px;
  }

  .bar {
    display: flex;
    gap: 8px;
  }

  input {
    flex: 1;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
</style>