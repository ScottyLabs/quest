<script lang="ts">
  import CoinAmount from "../CoinAmount.svelte";

  let { total, remaining }: { total: number; remaining: number } = $props();
</script>

<div class="panel">
  <div class="band top">
    <span class="label">Total Cost:</span>
    <CoinAmount amount={total} size={20} />
  </div>
  <div class="band low">
    <span class="label lean">ScottyCoins After Purchase:</span>
    <CoinAmount amount={remaining} size={20} before />
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    overflow: clip;
    width: 100%;
    border-radius: calc(19 * var(--u));
    color: var(--highlight);
  }

  .band {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .top {
    padding: 0 calc(21 * var(--u));
    background: var(--trade-total);
  }

  .low {
    padding: calc(2 * var(--u)) calc(12 * var(--u));
    background: var(--trade-after);
  }

  .label {
    padding: calc(10 * var(--u)) calc(4 * var(--u)) calc(10 * var(--u)) calc(10 * var(--u));
    font-size: calc(16 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.32 * var(--u));
    white-space: nowrap;
  }

  .lean {
    font-style: italic;
  }
</style>
