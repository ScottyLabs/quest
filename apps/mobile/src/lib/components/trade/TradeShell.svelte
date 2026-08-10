<script lang="ts">
  import type { Snippet } from "svelte";
  import TradeHeader from "./TradeHeader.svelte";
  import TradeTabs from "./TradeTabs.svelte";
  import { openTab, tab } from "$lib/trade.svelte";
  import { wallet } from "$lib/wallet.svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div class="trade">
  <div class="banner">
    <img class="wave" src="/img/trade/header-wave.svg" alt="" />
    <div class="wash"></div>

    <TradeHeader balance={wallet.scottycoins} />
    <TradeTabs current={tab.id} onpick={openTab} />
  </div>

  <div class="panel">
    {@render children()}
  </div>
</div>

<style>
  .trade {
    --notch: max(0px, calc(var(--safe-top) - 44 * var(--u)));

    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    background: var(--canvas);
  }

  .banner {
    position: relative;
    z-index: 1;
    height: calc(308 * var(--u) + var(--notch));
    flex: none;
  }

  .wave {
    position: absolute;
    z-index: 0;
    top: calc(-101 * var(--u) + var(--notch));
    left: calc(-15 * var(--u));
    width: calc(492.5 * var(--u));
    height: calc(401.505 * var(--u));
  }

  .wash {
    position: absolute;
    z-index: 1;
    top: 0;
    left: calc(-3 * var(--u));
    width: calc(467 * var(--u));
    height: calc(190 * var(--u) + var(--notch));
    background: linear-gradient(180deg, var(--accent) 0%, var(--sink) 100%);
  }

  .panel {
    position: relative;
    z-index: 0;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0 calc(24 * var(--u)) var(--dock-clear);
    overscroll-behavior: contain;
  }
</style>
