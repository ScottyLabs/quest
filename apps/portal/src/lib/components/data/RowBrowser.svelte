<script lang="ts">
  import type { Snippet } from "svelte";
  import { message, type TableView } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Empty from "$lib/components/Empty.svelte";
  import Field from "$lib/components/Field.svelte";
  import Grid from "$lib/components/Grid.svelte";
  import Pager from "$lib/components/Pager.svelte";
  import Panel from "$lib/components/Panel.svelte";
  import RowEditor from "$lib/components/RowEditor.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { announce } from "$lib/notice.svelte";
  import { listRows, type Query } from "$lib/rows";
  import { rowKey } from "$lib/values";

  let { table, extras }: { table: TableView; extras?: Snippet } = $props();

  const SIZES = [25, 50, 100, 200];

  const columns = $derived(table.columns);
  const key = $derived(table.key);
  const mayEdit = $derived(table.level === "edit" || table.level === "full");
  const mayCreate = $derived(table.level === "full");

  let limit = $state(50);
  let offset = $state(0);
  let order = $state<string | undefined>(undefined);
  let desc = $state(false);
  let search = $state("");
  let term = $state("");
  let stamp = $state(0);

  let rows = $state<Record<string, unknown>[]>([]);
  let total = $state(0);
  let started = $state(false);
  let busy = $state(false);
  let failure = $state<string | null>(null);
  let editing = $state<{ row: Record<string, unknown> | null; id: string } | null>(null);

  let sequence = 0;

  const trimmed = $derived(term.trim());

  const query = $derived<Query>({
    limit,
    offset,
    order,
    desc,
    search: trimmed === "" ? undefined : trimmed,
  });

  const request = $derived({ stamp, query });

  const detail = $derived(
    [
      total === 1 ? "1 row" : `${total} rows`,
      columns.length === 1 ? "1 column" : `${columns.length} columns`,
      key.length === 0 ? "no primary key" : `key ${key.join(", ")}`,
      `${table.level} access`,
    ].join(" · "),
  );

  $effect(() => {
    const typed = search;
    if (typed === term) return;

    const handle = setTimeout(() => {
      term = typed;
      offset = 0;
    }, 250);

    return () => clearTimeout(handle);
  });

  $effect(() => {
    void load(table.name, request.query);
  });

  async function load(name: string, current: Query): Promise<void> {
    const ticket = (sequence += 1);
    busy = true;

    try {
      const result = await listRows(name, current);

      if (ticket !== sequence) return;

      rows = result.rows as Record<string, unknown>[];
      total = result.total;
      failure = null;
    } catch (error) {
      if (ticket !== sequence) return;

      failure = message(error);
      rows = [];
      total = 0;
      announce(failure, "bad", 12000);
    } finally {
      if (ticket === sequence) {
        busy = false;
        started = true;
      }
    }
  }

  function sort(column: string): void {
    if (order === column) {
      desc = !desc;
    } else {
      order = column;
      desc = false;
    }

    offset = 0;
  }

  function edit(row: Record<string, unknown>): void {
    editing = {
      row,
      id: key.length === 0 ? `row:${rows.indexOf(row)}` : rowKey(row, key),
    };
  }

  function create(): void {
    editing = { row: null, id: "new" };
  }
</script>

<Panel title={table.name} {detail} flush>
  {#snippet actions()}
    {@render extras?.()}
    {#if mayCreate}
      <Button size="small" onclick={create}>New row</Button>
    {/if}
  {/snippet}

  <div class="tools">
    <Field label="Search" hint="every column">
      <input type="search" placeholder="substring match" bind:value={search} />
    </Field>

    <Field label="Rows per page">
      <select bind:value={limit} onchange={() => (offset = 0)}>
        {#each SIZES as size (size)}
          <option value={size}>{size}</option>
        {/each}
      </select>
    </Field>
  </div>

  {#if !started}
    <div class="wait"><Spinner label="Loading rows" /></div>
  {:else if failure !== null && rows.length === 0}
    <Empty title="Could not load rows" detail={failure} />
  {:else if rows.length === 0}
    <Empty
      title={trimmed === "" ? "No rows yet" : "Nothing matches that search"}
      detail={trimmed === ""
        ? `${table.name} is empty.${mayCreate ? " Use New row to add the first one." : ""}`
        : `No row in ${table.name} contains “${trimmed}”. Clear the search to see everything.`}
    />
  {:else}
    <div class="rows" class:dim={busy}>
      {#if mayEdit}
        <Grid {columns} {rows} {key} {order} {desc} onsort={sort} onpick={edit} />
      {:else}
        <Grid {columns} {rows} {key} {order} {desc} onsort={sort} />
      {/if}
    </div>

    <div class="foot">
      <Pager {offset} {limit} {total} onmove={(next) => (offset = next)} />
    </div>
  {/if}
</Panel>

{#if editing !== null}
  {@const target = editing}
  {#key target.id}
    <RowEditor
      table={table.name}
      {columns}
      {key}
      level={table.level}
      row={target.row}
      onclose={() => (editing = null)}
      onsaved={() => (stamp += 1)}
    />
  {/key}
{/if}

<style>
  .tools {
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) 9rem;
    padding: 14px 20px;
    border-bottom: 1px solid var(--line);
  }

  .wait {
    display: flex;
    justify-content: center;
    padding: 28px 20px;
  }

  .rows {
    min-width: 0;
    transition: opacity 120ms ease;
  }

  .rows.dim {
    opacity: 0.5;
  }

  .foot {
    padding: 10px 20px;
    border-top: 1px solid var(--line);
  }

  @media (max-width: 40rem) {
    .tools {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
