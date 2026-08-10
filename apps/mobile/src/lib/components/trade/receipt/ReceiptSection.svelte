<script lang="ts">
  import ReceiptRow from "./ReceiptRow.svelte";
  import type { Purchase } from "$lib/trade.svelte";

  let {
    title,
    rows,
    refundable,
    onrefund,
  }: {
    title: string;
    rows: Purchase[];
    refundable: boolean;
    onrefund?: (row: Purchase) => void;
  } = $props();
</script>

<section class="section">
  <header class="head">
    <h2>{title}</h2>
    {#if refundable}
      <span class="refund">Refund</span>
    {/if}
  </header>

  <div class="rows" class:flat={!refundable}>
    {#each rows as row (row.id)}
      <ReceiptRow {row} {refundable} {onrefund} />
    {/each}
  </div>
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }

  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    width: 100%;
    height: calc(44 * var(--u));
  }

  h2 {
    margin: 0;
    color: var(--secondary);
    font-size: calc(32 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.64 * var(--u));
    text-decoration: underline;
    text-underline-position: from-font;
  }

  .refund {
    flex: none;
    width: calc(40 * var(--u));
    margin-bottom: calc(9 * var(--u));
    color: #730c1a;
    font-size: calc(15 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.3 * var(--u));
    text-align: center;
    white-space: nowrap;
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: calc(15 * var(--u));
    align-items: flex-start;
    width: 100%;
  }

  .rows.flat {
    gap: 0;
  }
</style>
