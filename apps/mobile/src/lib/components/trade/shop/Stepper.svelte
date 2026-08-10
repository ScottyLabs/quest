<script lang="ts">
  let {
    value,
    min = 1,
    max,
    onchange,
  }: { value: number; min?: number; max: number; onchange: (next: number) => void } = $props();

  const floor = $derived(Math.min(min, max));
</script>

<div class="stepper">
  <button
    class="step"
    type="button"
    aria-label="One fewer"
    disabled={value <= floor}
    onclick={() => onchange(Math.max(floor, value - 1))}
  >
    <img src="/img/trade/stepper-minus.svg" alt="" />
  </button>

  <span class="value">{value}</span>

  <button
    class="step"
    type="button"
    aria-label="One more"
    disabled={value >= max}
    onclick={() => onchange(Math.min(max, value + 1))}
  >
    <img src="/img/trade/stepper-plus.svg" alt="" />
  </button>
</div>

<style>
  .stepper {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    gap: calc(10 * var(--u));
    padding: calc(8 * var(--u)) calc(10 * var(--u));
    border: 1px solid #676767;
    border-radius: calc(35 * var(--u));
    background: var(--highlight);
    filter: drop-shadow(0 calc(4 * var(--u)) 0 #676767);
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
    opacity: 0.3;
    cursor: default;
  }

  .step img {
    display: block;
    width: calc(16 * var(--u));
  }

  .value {
    min-width: calc(24 * var(--u));
    color: var(--accent);
    font-size: calc(15 * var(--u));
    font-weight: 600;
    text-align: center;
  }
</style>
