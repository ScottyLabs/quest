<script lang="ts">
  import CoinAmount from "../CoinAmount.svelte";

  let { cost }: { cost: number } = $props();
</script>

<span class="pill">
  <CoinAmount amount={cost} />
</span>

<style>
  .pill {
    display: grid;
    flex: none;
    width: calc(57.857 * var(--u));
    height: calc(45 * var(--u));
    border-radius: calc(12 * var(--u));
    background: #f0f0f0;
    box-shadow: 0 calc(6 * var(--u)) 0 #d7d7d7;
    place-items: center;
  }
</style>
