<script lang="ts">
  import type { Snippet } from "svelte";
  import { api, message, unwrap, type Page, type PortalColumn, type TableView } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Empty from "$lib/components/Empty.svelte";
  import Grid from "$lib/components/Grid.svelte";
  import Pager from "$lib/components/Pager.svelte";
  import Panel from "$lib/components/Panel.svelte";
  import RowEditor from "$lib/components/RowEditor.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { me } from "$lib/identity.svelte";
  import { announce } from "$lib/notice.svelte";
  import { listRows } from "$lib/rows";

  let {
    table,
    title,
    detail,
    group,
    columns,
    searchHint = "any value in any column",
    search = $bindable(""),
    limit = 50,
    createHint,
    refine,
    filterName = "the filter above",
    children,
  }: {
    table: string;
    title: string;
    detail: string;
    group: string;
    columns?: string[];
    searchHint?: string;
    search?: string;
    limit?: number;
    createHint?: string;
    refine?: (rows: Record<string, unknown>[]) => Record<string, unknown>[];
    filterName?: string;
    children?: Snippet;
  } = $props();

  const level = $derived(me.level(table));
  const mayRead = $derived(me.allows(table, "read"));
  const mayEdit = $derived(me.allows(table, "edit"));
  const mayCreate = $derived(me.allows(table, "full"));

  let meta = $state<TableView | null>(null);
  let sheet = $state<Page | null>(null);
  let fault = $state<string | null>(null);
  let loading = $state(true);
  let offset = $state(0);
  let order = $state<string | undefined>(undefined);
  let desc = $state(false);
  let term = $state("");
  let picked = $state<Record<string, unknown> | null>(null);
  let adding = $state(false);
  let ticket = 0;

  const shape = $derived<PortalColumn[]>(meta?.columns ?? sheet?.columns ?? []);
  const keyed = $derived<string[]>(meta?.key ?? sheet?.key ?? []);

  const visible = $derived<PortalColumn[]>(
    columns === undefined
      ? shape
      : columns
          .map((name) => shape.find((column) => column.name === name))
          .filter((column): column is PortalColumn => column !== undefined),
  );

  const fetched = $derived((sheet?.rows ?? []) as Record<string, unknown>[]);
  const rows = $derived(refine === undefined ? fetched : refine(fetched));
  const hushed = $derived(fetched.length - rows.length);

  const tail = "Other pages may still hold matches.";
  const aside = "The count below still describes the unfiltered table.";

  const veiled = $derived(
    fetched.length === 1
      ? `The one row loaded here is hidden by ${filterName}. ${tail}`
      : `All ${fetched.length} rows loaded here are hidden by ${filterName}. ${tail}`,
  );

  const some = $derived(hushed === 1 ? "1 row is" : `${hushed} rows are`);

  const trimmed = $derived(
    `${some} hidden by ${filterName}, out of the ${fetched.length} loaded here. ${aside}`,
  );

  async function pull(): Promise<void> {
    const mine = ++ticket;
    loading = true;

    try {
      const next = await listRows(table, {
        limit,
        offset,
        order,
        desc,
        search: term === "" ? undefined : term,
      });

      if (mine !== ticket) return;

      sheet = next;
      fault = null;
    } catch (error) {
      if (mine !== ticket) return;

      fault = message(error);
      sheet = null;
      announce(fault, "bad", 12000);
    } finally {
      if (mine === ticket) loading = false;
    }
  }

  async function describe(): Promise<void> {
    try {
      const views = await unwrap(await api.GET("/api/portal/tables"));
      meta = views.find((view) => view.name === table) ?? null;

      if (meta === null) {
        fault = `The ${table} table is not in your catalog. Ask a team lead to reload it.`;
        announce(fault, "bad", 12000);
      }
    } catch (error) {
      fault = message(error);
      announce(fault, "bad", 12000);
    }
  }

  $effect(() => {
    if (!mayRead) return;

    void describe();
  });

  $effect(() => {
    if (!mayRead) return;

    void pull();
  });

  $effect(() => {
    const next = search;

    const timer = setTimeout(() => {
      if (term === next) return;

      term = next;
      offset = 0;
    }, 250);

    return () => clearTimeout(timer);
  });

  function sort(column: string): void {
    if (order === column) {
      desc = !desc;
    } else {
      order = column;
      desc = false;
    }

    offset = 0;
  }

  function close(): void {
    picked = null;
    adding = false;
  }
</script>

{#if !mayRead}
  <Panel {title}>
    <Empty
      title="You cannot read {table}"
      detail="Ask a team lead to put you in the {group} group, then sign in again."
    />
  </Panel>
{:else}
  <Panel {title} {detail} flush>
    {#snippet actions()}
      {#if mayCreate}
        <Button size="small" title={createHint} onclick={() => (adding = true)}>New row</Button>
      {/if}
    {/snippet}

    {#if children !== undefined}
      <div class="lead">{@render children()}</div>
    {/if}

    <div class="bar">
      <input
        type="search"
        spellcheck="false"
        placeholder="Search {searchHint}"
        aria-label="Search {table}"
        bind:value={search}
      />
      <p class="note">
        Case-insensitive substring match against every column, applied by the database.
      </p>
    </div>

    {#if createHint !== undefined && mayCreate}
      <p class="hint">{createHint}</p>
    {/if}

    {#if loading && sheet === null}
      <Spinner label="Loading {table}" />
    {:else if fault !== null}
      <Empty title="Could not load {table}" detail={fault} />
    {:else if rows.length === 0 && fetched.length > 0}
      <Empty title="Nothing on this page passes {filterName}" detail={veiled} />
    {:else if rows.length === 0 && term !== ""}
      <Empty
        title="Nothing matches"
        detail="No {table} row contains &ldquo;{term}&rdquo; in any column."
      />
    {:else if rows.length === 0}
      <Empty title="Nothing here yet" detail="The {table} table has no rows." />
    {:else}
      <Grid
        columns={visible}
        {rows}
        key={keyed}
        {order}
        {desc}
        onsort={sort}
        onpick={mayEdit ? (row) => (picked = row) : undefined}
      />

      {#if hushed > 0}
        <p class="hint">{trimmed}</p>
      {/if}

      <Pager
        {offset}
        {limit}
        total={sheet?.total ?? rows.length}
        onmove={(next) => (offset = next)}
      />
    {/if}
  </Panel>
{/if}

{#if adding || picked !== null}
  <RowEditor
    {table}
    columns={shape}
    key={keyed}
    {level}
    row={adding ? null : picked}
    onclose={close}
    onsaved={() => void pull()}
  />
{/if}

<style>
  .lead {
    padding: 16px 20px;
    border-bottom: 1px solid var(--line);
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid var(--line);
    background: var(--canvas);
  }

  input {
    flex: 1;
    min-width: 14rem;
    max-width: 26rem;
    padding: 8px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--highlight);
    font-size: 13px;
  }

  input:focus {
    border-color: var(--accent);
    outline: none;
  }

  .note {
    margin: 0;
    color: var(--tertiary);
    font-size: 12px;
  }

  .hint {
    margin: 0;
    padding: 10px 20px;
    color: var(--tertiary);
    font-size: 12px;
    line-height: 1.5;
  }
</style>
