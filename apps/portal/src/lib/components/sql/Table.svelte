<script lang="ts">
  import { display } from "$lib/values";

  let {
    columns,
    rows,
    tight = false,
  }: { columns: string[]; rows: unknown[]; tight?: boolean } = $props();

  function cellOf(row: unknown, column: string): unknown {
    if (row === null || typeof row !== "object") return null;

    const found = (row as Record<string, unknown>)[column];

    return found === undefined ? null : found;
  }
</script>

<div class="scroll" class:tight>
  <table>
    <thead>
      <tr>
        {#each columns as column (column)}
          <th>{column}</th>
        {/each}
      </tr>
    </thead>

    <tbody>
      {#each rows as row, index (index)}
        <tr>
          {#each columns as column (column)}
            {@const value = cellOf(row, column)}
            <td title={display(value)}>
              {#if value === null}
                <span class="null">null</span>
              {:else}
                {display(value)}
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .scroll {
    overflow: auto;
    max-width: 100%;
    max-height: 60vh;
  }

  .scroll.tight {
    max-height: 18rem;
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
    color: var(--ink-shade);
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 800;
    text-align: left;
    white-space: nowrap;
  }

  td {
    max-width: 28rem;
    padding: 7px 12px;
    border-bottom: 1px solid var(--line);
    overflow: hidden;
    font-variant-numeric: tabular-nums;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  tbody tr:hover {
    background: var(--canvas);
  }

  .null {
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
  }
</style>
