<script lang="ts">
  import CoinAmount from "../CoinAmount.svelte";

  let { cost }: { cost: number } = $props();
</script>

<span class="pill">
  <CoinAmount amount={cost} textSize={13} />
</span>

<style>
  .pill {
    display: grid;
    flex: none;
    width: calc(57.857 * var(--u));
    height: calc(45 * var(--u));
    border-radius: calc(12 * var(--u));
    background: var(--trade-pill);
    box-shadow: 0 calc(6 * var(--u)) 0 var(--trade-pill-shade);
    place-items: center;
  }
</style>
