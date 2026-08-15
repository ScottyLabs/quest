<script lang="ts">
  import type { ShopItem, TableView } from "$lib/api/client";
  import { message } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Chip from "$lib/components/Chip.svelte";
  import Empty from "$lib/components/Empty.svelte";
  import Field from "$lib/components/Field.svelte";
  import Panel from "$lib/components/Panel.svelte";
  import RowEditor from "$lib/components/RowEditor.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import ImagePicker from "$lib/components/trade/ImagePicker.svelte";
  import { me } from "$lib/identity.svelte";
  import { announce } from "$lib/notice.svelte";
  import { listRows } from "$lib/rows";

  let {
    items,
    loading,
    fault,
    table,
    onchanged,
  }: {
    items: ShopItem[];
    loading: boolean;
    fault: string | null;
    table: TableView | null;
    onchanged: () => void;
  } = $props();

  type Row = Record<string, unknown>;

  const SORTS = [
    { id: "name", label: "Name" },
    { id: "cost", label: "Cost" },
    { id: "stock", label: "Stock left" },
  ] as const;

  type Sort = (typeof SORTS)[number]["id"];

  const mayEdit = $derived(me.allows("items", "edit"));
  const mayCreate = $derived(me.allows("items", "full"));
  const mayUpload = $derived(mayEdit && me.can("assets"));
  const level = $derived(me.level("items"));

  let sort = $state<Sort>("name");
  let rows = $state<Row[]>([]);
  let editing = $state<Row | null>(null);
  let creating = $state(false);

  const sorted = $derived(
    [...items].sort((left, right) => {
      if (sort === "cost") return left.cost - right.cost;
      if (sort === "stock") return left.stock - right.stock;

      return left.name.localeCompare(right.name);
    }),
  );

  const byId = $derived(new Map(rows.map((row) => [String(row["id"] ?? ""), row])));

  async function loadRows(): Promise<void> {
    try {
      const page = await listRows("items", { limit: 200, order: "name" });
      rows = page.rows as Row[];
    } catch (error) {
      announce(message(error), "bad");
    }
  }

  $effect(() => {
    if (!mayEdit) return;

    void loadRows();
  });

  function saved(): void {
    void loadRows();
    onchanged();
  }

  function toneFor(stock: number): "bad" | "warn" | "good" {
    if (stock <= 0) return "bad";

    return stock < 5 ? "warn" : "good";
  }

  function labelFor(stock: number): string {
    if (stock <= 0) return "out of stock";

    return stock < 5 ? `low \u00b7 ${stock} left` : `${stock} in stock`;
  }

  function readSort(value: string): Sort {
    return value === "cost" || value === "stock" ? value : "name";
  }
</script>

<Panel
  title="Catalog"
  detail="Stock is what is still on the shelf. Editing cost is retroactive: balances are derived
    from cost, so a change rewrites every past purchase. Creating an item needs a uuid for id by
    hand, because that column has no database default."
>
  {#snippet actions()}
    <div class="tools">
      <Field label="Sort by">
        <select value={sort} onchange={(event) => (sort = readSort(event.currentTarget.value))}>
          {#each SORTS as option (option.id)}
            <option value={option.id}>{option.label}</option>
          {/each}
        </select>
      </Field>

      {#if mayCreate}
        <Button size="small" onclick={() => (creating = true)}>New item</Button>
      {/if}
    </div>
  {/snippet}

  {#if loading}
    <Spinner label="Loading the catalog" />
  {:else if fault !== null}
    <Empty title="The catalog did not load" detail={fault} />
  {:else if sorted.length === 0}
    <Empty title="No items yet" detail="Nothing is stocked in Terrier Trade." />
  {:else}
    <div class="cards">
      {#each sorted as item (item.id)}
        {@const row = byId.get(item.id)}
        <article class="card">
          <div class="shot">
            {#if item.image_url}
              <img src={item.image_url} alt={item.name} loading="lazy" />
            {:else}
              <span class="void">No image</span>
            {/if}
          </div>

          <h3>{item.name}</h3>
          <p class="detail">{item.description}</p>

          <div class="foot">
            <span class="cost"><span class="coin" aria-hidden="true"></span>{item.cost}</span>
            <Chip tone={toneFor(item.stock)}>{labelFor(item.stock)}</Chip>
          </div>

          {#if mayEdit}
            <div class="act">
              {#if mayUpload}
                <ImagePicker {item} onsaved={saved} />
              {/if}
              <Button
                size="small"
                tone="line"
                disabled={row === undefined}
                title={row === undefined ? "This row is not in the first 200 items" : undefined}
                onclick={() => (editing = row ?? null)}
              >
                Edit
              </Button>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</Panel>

{#if editing !== null && table !== null}
  <RowEditor
    table="items"
    columns={table.columns}
    key={table.key}
    {level}
    row={editing}
    onclose={() => (editing = null)}
    onsaved={saved}
  />
{/if}

{#if creating && table !== null}
  <RowEditor
    table="items"
    columns={table.columns}
    key={table.key}
    {level}
    row={null}
    onclose={() => (creating = false)}
    onsaved={saved}
  />
{/if}

<style>
  .tools {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }

  .cards {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--highlight);
  }

  .shot {
    display: grid;
    height: 8rem;
    border-radius: var(--radius);
    background: var(--tertiary-normal);
    overflow: hidden;
    place-items: center;
  }

  .shot img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .void {
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
  }

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .detail {
    margin: 0;
    flex: 1;
    color: var(--tertiary);
    font-size: 12px;
    line-height: 1.5;
  }

  .foot {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }

  .cost {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    color: var(--ink-shade);
    font-size: 14px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .coin {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--coin);
  }

  .act {
    display: flex;
    justify-content: flex-end;
  }
</style>
