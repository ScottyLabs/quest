<script lang="ts">
  let {
    offset,
    limit,
    total,
    onmove,
  }: { offset: number; limit: number; total: number; onmove: (offset: number) => void } = $props();

  const from = $derived(total === 0 ? 0 : offset + 1);
  const to = $derived(Math.min(offset + limit, total));
</script>

<div class="pager">
  <span>{from}&ndash;{to} of {total}</span>

  <div class="steps">
    <button type="button" disabled={offset <= 0} onclick={() => onmove(Math.max(0, offset - limit))}>
      Previous
    </button>
    <button type="button" disabled={to >= total} onclick={() => onmove(offset + limit)}>
      Next
    </button>
  </div>
</div>

<style>
  .pager {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-top: 1px solid var(--line);
    color: var(--tertiary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .steps {
    display: flex;
    gap: 6px;
  }

  button {
    padding: 5px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--highlight);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
