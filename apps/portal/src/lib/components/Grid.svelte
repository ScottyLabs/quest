<script lang="ts">
  import type { Snippet } from "svelte";
  import type { PortalColumn } from "$lib/api/client";
  import { display } from "$lib/values";

  let {
    columns,
    rows,
    key = [],
    order,
    desc = false,
    onsort,
    onpick,
    trailing,
  }: {
    columns: PortalColumn[];
    rows: Record<string, unknown>[];
    key?: string[];
    order?: string;
    desc?: boolean;
    onsort?: (column: string) => void;
    onpick?: (row: Record<string, unknown>) => void;
    trailing?: Snippet<[Record<string, unknown>]>;
  } = $props();
</script>

<div class="scroll">
  <table>
    <thead>
      <tr>
        {#each columns as column (column.name)}
          <th class:keyed={key.includes(column.name)}>
            {#if onsort !== undefined}
              <button type="button" onclick={() => onsort(column.name)}>
                <span class="name">{column.name}</span>
                {#if order === column.name}<span class="arrow">{desc ? "\u2193" : "\u2191"}</span>{/if}
              </button>
            {:else}
              <span class="name">{column.name}</span>
            {/if}
            <span class="kind">{column.kind}</span>
          </th>
        {/each}
        {#if trailing !== undefined}<th class="tail"></th>{/if}
      </tr>
    </thead>

    <tbody>
      {#each rows as row, index (index)}
        <tr
          class:clickable={onpick !== undefined}
          onclick={onpick === undefined ? undefined : () => onpick(row)}
        >
          {#each columns as column (column.name)}
            {@const text = display(row[column.name])}
            <td class:blank={text === ""} title={text}>
              {#if row[column.name] === null || row[column.name] === undefined}
                <span class="null">null</span>
              {:else}
                {text}
              {/if}
            </td>
          {/each}
          {#if trailing !== undefined}
            <td class="tail">{@render trailing(row)}</td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
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
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 8px 12px;
    border-bottom: 1px solid var(--line);
    background: var(--tertiary-normal);
    text-align: left;
    white-space: nowrap;
  }

  th.keyed {
    background: var(--tint);
  }

  th button {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .name {
    color: var(--ink-shade);
    font-size: 12px;
    font-weight: 800;
  }

  .arrow {
    color: var(--accent);
    font-size: 11px;
  }

  .kind {
    display: block;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 400;
  }

  td {
    max-width: 26rem;
    padding: 7px 12px;
    border-bottom: 1px solid var(--line);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  tbody tr:hover {
    background: var(--canvas);
  }

  tr.clickable {
    cursor: pointer;
  }

  .null {
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
  }

  .tail {
    width: 1%;
    text-align: right;
    white-space: nowrap;
  }
</style>
