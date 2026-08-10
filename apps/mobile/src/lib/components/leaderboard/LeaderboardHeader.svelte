<script lang="ts">
  import type { Metric } from "$lib/leaderboard.svelte";

  let { metric, ontoggle }: { metric: Metric; ontoggle: () => void } = $props();

  const label = $derived(
    metric === "gems" ? "Show the ScottyCoin leaderboard" : "Show the Thistlestone leaderboard",
  );
  const badge = $derived(
    metric === "gems" ? "/img/leaderboard/medal.svg" : "/img/leaderboard/medal-stone.svg",
  );
</script>

<div class="banner">
  <img class="band" src="/img/leaderboard/wave-band.svg" alt="" />
  <img class="red" src="/img/leaderboard/wave-red.svg" alt="" />

  <div class="brand">
    <img class="chart" src="/img/leaderboard/chart.svg" alt="" />
    <h1>Leaderboard</h1>
  </div>

  <button class="medal" type="button" aria-label={label} onclick={ontoggle}>
    <img src={badge} alt="" />
  </button>
</div>

<style>
  .banner {
    position: relative;
    z-index: 2;
    height: calc(346 * var(--u) + var(--notch));
    flex: none;
    pointer-events: none;
  }

  .band {
    position: absolute;
    z-index: 0;
    top: calc(-66 * var(--u) + var(--notch));
    left: -6.378%;
    width: 112.073%;
    height: calc(427 * var(--u));
    filter: drop-shadow(0 calc(10 * var(--u)) calc(26 * var(--u)) rgb(0 0 0 / 92%));
  }

  .red {
    position: absolute;
    z-index: 1;
    top: calc(-164 * var(--u) + var(--notch));
    left: -4.328%;
    width: 112.073%;
    height: calc(387 * var(--u));
  }

  .brand {
    position: absolute;
    z-index: 3;
    top: calc(68 * var(--u) + var(--notch));
    left: calc(27 * var(--u));
    display: flex;
    align-items: flex-end;
    gap: calc(10 * var(--u));
  }

  .chart {
    display: block;
    flex: none;
    width: calc(97 * var(--u));
    height: calc(97 * var(--u));
  }

  h1 {
    margin: 0 0 calc(5 * var(--u));
    color: var(--highlight);
    font-size: calc(32 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.64 * var(--u));
  }

  .medal {
    position: absolute;
    z-index: 2;
    top: calc(-111 * var(--u) + var(--notch));
    left: calc(270 * var(--u));
    display: grid;
    width: calc(294.044 * var(--u));
    height: calc(300.485 * var(--u));
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    pointer-events: auto;
    place-items: center;
  }

  .medal:active img {
    scale: 0.94;
  }

  .medal img {
    display: block;
    width: calc(217.499 * var(--u));
    height: calc(230.643 * var(--u));
    rotate: -24.73deg;
  }
</style>
