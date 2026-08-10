<script lang="ts">
  let {
    value,
    min = 1,
    max,
    onchange,
  }: { value: number; min?: number; max: number; onchange: (next: number) => void } = $props();

  const clamp = (next: number) => Math.min(max, Math.max(min, next));
</script>

<div class="stepper">
  <button
    class="step"
    type="button"
    aria-label="One fewer"
    disabled={value <= min}
    onclick={() => onchange(clamp(value - 1))}
  >
    <img class="minus" src="/img/trade/receipt-minus.svg" alt="" />
  </button>

  <output class="count">{value}</output>

  <button
    class="step"
    type="button"
    aria-label="One more"
    disabled={value >= max}
    onclick={() => onchange(clamp(value + 1))}
  >
    <img class="plus" src="/img/trade/receipt-plus.svg" alt="" />
  </button>
</div>

<style>
  .stepper {
    display: flex;
    gap: calc(49 * var(--u));
    align-items: center;
    justify-content: center;
    height: calc(35 * var(--u));
    padding: 0 calc(16 * var(--u));
    border-radius: calc(24 * var(--u));
    background: var(--accent);
  }

  .step {
    display: grid;
    flex: none;
    width: calc(24 * var(--u));
    height: calc(24 * var(--u));
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    place-items: center;
  }

  .step:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .step:not(:disabled):active {
    scale: 0.9;
  }

  .minus {
    display: block;
    width: calc(16 * var(--u));
    height: calc(2 * var(--u));
  }

  .plus {
    display: block;
    width: calc(16 * var(--u));
    height: calc(16 * var(--u));
  }

  .count {
    color: var(--highlight);
    font-size: calc(16 * var(--u));
    font-weight: 700;
    line-height: calc(24 * var(--u));
    text-align: center;
  }
</style>
