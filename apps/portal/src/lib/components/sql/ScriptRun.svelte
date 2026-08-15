<script lang="ts">
  import type { Schemas } from "$lib/api/client";
  import Chip from "$lib/components/Chip.svelte";
  import Table from "$lib/components/sql/Table.svelte";

  let { script }: { script: Schemas["Script"] } = $props();

  let shown = $state<Record<number, boolean>>({});
  let opened = $state<Record<number, boolean>>({});

  const skipped = $derived(script.statements - script.steps.length);

  const verdict = $derived.by(() => {
    if (script.committed && script.read_only) {
      return `Dry run finished. All ${script.statements} statements ran inside a READ ONLY
        transaction and nothing was written.`;
    }

    if (script.committed) {
      return `Committed. All ${script.statements} statements ran and the transaction was kept.`;
    }

    const at = (script.failed ?? 0) + 1;

    return `Rolled back at statement ${at} of ${script.statements}. Nothing this script did was
      kept.`;
  });

  function long(statement: string): boolean {
    return statement.split("\n").length > 3 || statement.length > 220;
  }
</script>

<div class="strip">
  <span class="stat">
    <b>{script.statements}</b>
    {script.statements === 1 ? "statement" : "statements"}
  </span>
  <span class="stat"><b>{script.elapsed_ms}</b> ms</span>

  {#if !script.committed}
    <Chip tone="bad">rolled back</Chip>
  {:else if script.read_only}
    <Chip>dry run, nothing written</Chip>
  {:else}
    <Chip tone="good">committed</Chip>
  {/if}
</div>

<p class="verdict" class:bad={!script.committed}>{verdict}</p>

<ol>
  {#each script.steps as step, index (index)}
    {@const failed = step.error !== null && step.error !== undefined}
    <li class:failed>
      <div class="line">
        <span class="count">{index + 1}</span>

        <div class="body">
          <pre class="sql" class:open={opened[index] === true}>{step.statement}</pre>

          {#if long(step.statement)}
            <button type="button" onclick={() => (opened[index] = opened[index] !== true)}>
              {opened[index] === true ? "Show less" : "Show the whole statement"}
            </button>
          {/if}

          {#if step.error !== null && step.error !== undefined}
            <pre class="failure">{step.error}</pre>
          {/if}
        </div>

        <div class="tag">
          {#if failed}
            <Chip tone="bad">failed</Chip>
          {:else if step.outcome !== null && step.outcome !== undefined}
            {#if step.outcome.columns.length > 0}
              <Chip>{step.outcome.rows_affected} rows</Chip>
            {:else}
              <Chip tone="accent">{step.outcome.rows_affected} rows affected</Chip>
            {/if}
          {/if}
        </div>
      </div>

      {#if step.outcome !== null && step.outcome !== undefined && step.outcome.columns.length > 0}
        {@const outcome = step.outcome}
        <button
          type="button"
          class="rows"
          onclick={() => (shown[index] = shown[index] !== true)}
        >
          {shown[index] === true ? "Hide rows" : `Show ${outcome.rows.length} rows`}
        </button>

        {#if shown[index] === true}
          <Table columns={outcome.columns} rows={outcome.rows} tight />
        {/if}
      {/if}
    </li>
  {/each}
</ol>

{#if skipped > 0}
  <p class="skipped">
    {skipped}
    {skipped === 1 ? "statement" : "statements"} after the failure never ran.
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

  .verdict {
    margin: 0;
    padding: 12px 20px;
    border-bottom: 1px solid var(--line);
    background: var(--good-fill);
    color: var(--ink-shade);
    font-size: 13px;
    font-weight: 700;
  }

  .verdict.bad {
    background: var(--danger-fill);
    color: var(--danger);
  }

  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    padding: 10px 20px;
    border-bottom: 1px solid var(--line);
  }

  li.failed {
    border-left: 4px solid var(--danger);
    background: var(--danger-fill);
  }

  .line {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .count {
    flex: none;
    width: 24px;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .body {
    flex: 1;
    min-width: 0;
  }

  .tag {
    flex: none;
  }

  .sql {
    margin: 0;
    max-height: 4.8em;
    overflow: hidden;
    color: var(--secondary);
    font-family: var(--mono);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .sql.open {
    max-height: none;
  }

  .failure {
    margin: 8px 0 0;
    padding: 8px 10px;
    border: 1px solid var(--danger);
    border-radius: 8px;
    background: var(--highlight);
    color: var(--danger);
    font-family: var(--mono);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  button {
    margin: 4px 0 0;
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  button.rows {
    margin: 6px 0 0 36px;
  }

  .skipped {
    margin: 0;
    padding: 12px 20px;
    color: var(--tertiary);
    font-size: 12px;
  }
</style>
