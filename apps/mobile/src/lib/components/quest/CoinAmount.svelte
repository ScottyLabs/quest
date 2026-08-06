<script lang="ts">
  import ScottyCoin from "$lib/components/ScottyCoin.svelte";

  let { amount, size = 18 }: { amount: number; size?: number } = $props();
</script>

<p class="amount" aria-label="{amount} ScottyCoins">
  <span>{amount}</span>
  <ScottyCoin {size} alt="" />
</p>

<style>
  .amount {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 0;
    color: var(--secondary);
    font-size: 14px;
    letter-spacing: 0.28px;
  }
</style>
