<script lang="ts">
  import type { Outcome } from "$lib/api/client";
  import Chip from "$lib/components/Chip.svelte";
  import Table from "$lib/components/sql/Table.svelte";

  let { outcome }: { outcome: Outcome } = $props();
</script>

<div class="strip">
  <span class="stat">
    <b>{outcome.rows_affected}</b>
    {outcome.rows_affected === 1 ? "row" : "rows"}
  </span>
  <span class="stat"><b>{outcome.elapsed_ms}</b> ms</span>

  {#if outcome.read_only}
    <Chip>read only</Chip>
  {:else}
    <Chip tone="bad">write</Chip>
  {/if}

  {#if outcome.truncated}
    <Chip tone="warn">2000-row cap trimmed the output</Chip>
  {/if}
</div>

{#if outcome.columns.length > 0}
  <Table columns={outcome.columns} rows={outcome.rows} />
{:else}
  <p class="affected">
    {outcome.rows_affected}
    {outcome.rows_affected === 1 ? "row affected" : "rows affected"}
  </p>
{/if}

<style>
  .strip {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid var(--line);
    background: var(--highlight);
  }

  .stat {
    color: var(--tertiary);
    font-size: 12px;
  }

  .stat b {
    color: var(--secondary);
    font-family: var(--mono);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }

  .affected {
    margin: 0;
    padding: 18px 20px;
    color: var(--ink-shade);
    font-family: var(--mono);
    font-size: 13px;
  }
</style>
