<script lang="ts">
  import type { Purchase } from "$lib/trade.svelte";

  let {
    row,
    refundable,
    onrefund,
  }: { row: Purchase; refundable: boolean; onrefund?: (row: Purchase) => void } = $props();

  const canRefund = $derived(refundable && !row.delivered);
</script>

<div class="row" class:done={!canRefund}>
  <span class="name">{row.name}</span>

  <span class="tail">
    <span class="qty">x{row.quantity}</span>

    {#if canRefund}
      <button
        class="edit"
        type="button"
        aria-label="Refund {row.name}"
        onclick={() => onrefund?.(row)}
      >
        <img src="/img/trade/receipt-edit.svg" alt="" />
      </button>
    {/if}
  </span>
</div>

<style>
  .row {
    display: flex;
    gap: calc(10 * var(--u));
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .row.done {
    align-items: flex-start;
    color: var(--tertiary);
    text-decoration: line-through;
    text-decoration-skip-ink: none;
  }

  .name {
    flex: 1;
    min-width: 0;
    padding: calc(4 * var(--u));
    font-size: calc(20 * var(--u));
    letter-spacing: calc(0.4 * var(--u));
    word-break: break-word;
  }

  .tail {
    display: flex;
    flex: none;
    gap: calc(10 * var(--u));
    align-items: center;
  }

  .qty {
    padding: calc(4 * var(--u));
    font-size: calc(20 * var(--u));
    letter-spacing: calc(0.4 * var(--u));
    text-align: right;
    white-space: nowrap;
  }

  .edit {
    display: grid;
    flex: none;
    width: calc(40 * var(--u));
    height: calc(40 * var(--u));
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    place-items: center;
  }

  .edit:active {
    scale: 0.92;
  }

  .edit img {
    display: block;
    width: calc(37.04 * var(--u));
    height: calc(37.04 * var(--u));
  }
</style>
