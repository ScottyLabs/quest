<script lang="ts">
  import type { TableView } from "$lib/api/client";
  import Chip from "$lib/components/Chip.svelte";
  import Field from "$lib/components/Field.svelte";

  let {
    tables,
    selected,
    onpick,
  }: {
    tables: TableView[];
    selected: string | null;
    onpick: (table: string) => void;
  } = $props();

  const TONES = { none: "bad", read: "neutral", edit: "warn", full: "good" } as const;

  let filter = $state("");

  const needle = $derived(filter.trim().toLowerCase());
  const shown = $derived(tables.filter((table) => table.name.toLowerCase().includes(needle)));

  function summary(table: TableView): string {
    const count = table.columns.length === 1 ? "1 column" : `${table.columns.length} columns`;

    return table.key.length === 0 ? `${count} · no primary key` : count;
  }
</script>

<div class="pick">
  <Field label="Filter" hint="{shown.length}/{tables.length}">
    <input type="search" placeholder="table name" bind:value={filter} />
  </Field>

  {#if shown.length === 0}
    <p class="none">
      {tables.length === 0 ? "No table is within your reach." : `Nothing matches “${filter}”.`}
    </p>
  {:else}
    <ul>
      {#each shown as table (table.name)}
        <li>
          <button
            type="button"
            class:on={table.name === selected}
            aria-current={table.name === selected}
            onclick={() => onpick(table.name)}
          >
            <span class="name">{table.name}</span>
            <Chip tone={TONES[table.level]}>{table.level}</Chip>
            <span class="count">
              {summary(table)}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .pick {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 60vh;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  button {
    display: grid;
    gap: 2px 8px;
    align-items: center;
    grid-template-columns: minmax(0, 1fr) auto;
    width: 100%;
    padding: 7px 9px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: none;
    text-align: left;
    cursor: pointer;
  }

  button:hover {
    border-color: var(--line);
    background: var(--tertiary-normal);
  }

  button.on {
    border-color: var(--tint);
    background: var(--canvas);
  }

  .name {
    color: var(--secondary);
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .count {
    grid-column: 1 / -1;
    color: var(--tertiary);
    font-size: 11px;
  }

  .none {
    margin: 0;
    color: var(--tertiary);
    font-size: 12px;
    line-height: 1.6;
  }
</style>
