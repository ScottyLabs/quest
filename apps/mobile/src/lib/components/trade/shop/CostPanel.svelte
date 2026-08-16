<script lang="ts">
  import CoinAmount from "../CoinAmount.svelte";

  let { total, remaining }: { total: number; remaining: number } = $props();
</script>

<div class="panel">
  <div class="band top">
    <span class="label">Total Cost:</span>
    <span class="value"><CoinAmount amount={total} size={20} /></span>
  </div>
  <div class="band low">
    <span class="label lean">ScottyCoins After Purchase:</span>
    <span class="value"><CoinAmount amount={remaining} size={20} before /></span>
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
    min-height: calc(42 * var(--u));
    padding: 0 calc(21 * var(--u));
    background: var(--trade-total);
  }

  .low {
    min-height: calc(46 * var(--u));
    padding: calc(2 * var(--u)) calc(12 * var(--u));
    background: var(--trade-after);
  }

  .label {
    flex: 0 1 auto;
    min-width: 0;
    padding: calc(10 * var(--u)) calc(4 * var(--u)) calc(10 * var(--u)) calc(10 * var(--u));
    font-size: calc(16 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.32 * var(--u));
    line-height: calc(22 * var(--u));
    overflow-wrap: anywhere;
  }

  .value {
    display: flex;
    flex: none;
    align-items: center;
    white-space: nowrap;
  }

  .lean {
    font-style: italic;
  }
</style>
