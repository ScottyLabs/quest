<script lang="ts">
  let {
    amount,
    size = 21,
    textSize = 16,
    before = false,
  }: {
    amount: number | string;
    size?: number;
    textSize?: number;
    before?: boolean;
  } = $props();
</script>

<span class="coin" style:--coin={size} style:--text-size={textSize}>
  {#if before}
    <img src="/img/trade/coin.svg" alt="ScottyCoins" />
    <span class="value">{amount}</span>
  {:else}
    <span class="value">{amount}</span>
    <img src="/img/trade/coin.svg" alt="ScottyCoins" />
  {/if}
</span>

<style>
  .coin {
    display: inline-flex;
    align-items: center;
    gap: calc(4 * var(--u));
  }

.value {
  font-size: calc(var(--text-size) * var(--u));
  font-weight: 600;
  letter-spacing: calc(0.32 * var(--u));
}

  img {
    display: block;
    flex: none;
    width: calc(var(--coin) * var(--u));
    height: calc(var(--coin) * var(--u) * 22 / 21);
  }
</style>
