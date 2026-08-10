<script lang="ts">
  import type { Metric } from "$lib/leaderboard.svelte";

  let {
    rank,
    score,
    metric,
    heading,
    onjump,
  }: {
    rank: number;
    score: number;
    metric: Metric;
    heading: "up" | "down";
    onjump: () => void;
  } = $props();

  const icon = $derived(metric === "coins" ? "/img/trade/coin.svg" : "/img/leaderboard/gem.svg");
</script>

<button class="jump" class:up={heading === "up"} type="button" onclick={onjump}>
  <span class="arrow" aria-hidden="true"></span>
  <span class="text">You&rsquo;re #{rank}</span>
  <img class="pip" src={icon} alt="" />
  <span class="tally">{score}</span>
</button>

<style>
  .jump {
    position: absolute;
    z-index: 4;
    bottom: calc(var(--dock-clear) + 12 * var(--u));
    left: 50%;
    display: flex;
    align-items: center;
    gap: calc(9 * var(--u));
    height: calc(46 * var(--u));
    padding: 0 calc(20 * var(--u));
    border: 0;
    border-radius: calc(23 * var(--u));
    background: var(--accent);
    box-shadow: 0 calc(4 * var(--u)) 0 var(--band);
    color: var(--highlight);
    font: inherit;
    cursor: pointer;
    translate: -50% 0;
  }

  .jump:active {
    box-shadow: 0 0 0 var(--band);
    translate: -50% calc(4 * var(--u));
  }

  .arrow {
    width: 0;
    height: 0;
    border-right: calc(6 * var(--u)) solid transparent;
    border-left: calc(6 * var(--u)) solid transparent;
    border-top: calc(8 * var(--u)) solid var(--highlight);
  }

  .up .arrow {
    border-top: 0;
    border-bottom: calc(8 * var(--u)) solid var(--highlight);
  }

  .text {
    font-size: calc(15 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.3 * var(--u));
    white-space: nowrap;
  }

  .pip {
    display: block;
    width: calc(20 * var(--u));
    height: calc(20 * var(--u));
  }

  .tally {
    font-size: calc(15 * var(--u));
    font-weight: 700;
  }
</style>
