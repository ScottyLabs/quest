<script lang="ts">
  import type { Purchase } from "$lib/trade.svelte";

  let {
    row,
    refundable,
    onrefund,
  }: { row: Purchase; refundable: boolean; onrefund?: (row: Purchase) => void } = $props();

  const canRefund = $derived(refundable && !row.delivered);
  const picks = $derived(row.options);
</script>

<div class="row" class:done={!canRefund} class:picked={picks.length > 0}>
  <span class="main">
    <span class="name">{row.name}</span>

    {#if picks.length > 0}
      <span class="picks">
        {#each picks as pick, index (index)}
          <span class="pick">
            <span class="key">{pick.label}</span>
            <span class="val">{pick.value}</span>
          </span>
        {/each}
      </span>
    {/if}
  </span>

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

  .row.picked {
    align-items: flex-start;
  }

  .main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .name {
    min-width: 0;
    padding: calc(4 * var(--u));
    font-size: calc(20 * var(--u));
    letter-spacing: calc(0.4 * var(--u));
    word-break: break-word;
  }

  .picks {
    display: flex;
    flex-wrap: wrap;
    gap: calc(4 * var(--u)) calc(6 * var(--u));
    padding: 0 calc(4 * var(--u)) calc(3 * var(--u));
  }

  .pick {
    display: inline-flex;
    gap: calc(5 * var(--u));
    align-items: baseline;
    max-width: 100%;
    padding: calc(2 * var(--u)) calc(8 * var(--u));
    border-radius: calc(9 * var(--u));
    background: var(--trade-pill);
    font-size: calc(14 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.28 * var(--u));
    line-height: calc(19 * var(--u));
  }

  .key {
    flex: none;
    color: var(--tertiary);
  }

  .val {
    min-width: 0;
    color: var(--secondary);
    font-weight: 700;
    word-break: break-word;
  }

  .row.done .val {
    color: var(--tertiary);
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
