<script lang="ts">
  import { mascotFor, type Metric, type Standing } from "$lib/leaderboard.svelte";

  let { row, metric }: { row: Standing; metric: Metric } = $props();

  const house = $derived(mascotFor(row.community)?.home ?? "");
  const icon = $derived(metric === "coins" ? "/img/trade/coin.svg" : "/img/leaderboard/gem.svg");
</script>

<div class="row" class:you={row.you}>
  <span class="rank">{row.rank}.</span>

  <span class="who">
    <span class="name">{row.name}</span>
    <span class="house">{house}</span>
  </span>

  <span class="score">
    <img class="gem" src={icon} alt="" />
    <span class="tally">{row.score}</span>
  </span>
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: calc(20 * var(--u));
    width: 100%;
    height: calc(80 * var(--u));
    padding: 0 calc(27.5 * var(--u));
  }

  .you {
    height: calc(92 * var(--u));
    padding-top: calc(13 * var(--u));
    padding-bottom: calc(23 * var(--u));
    border-bottom: calc(6 * var(--u)) solid var(--band);
    background: var(--accent);
  }

  .rank {
    flex: none;
    width: calc(40 * var(--u));
    color: var(--ink-shade);
    font-size: calc(28 * var(--u));
    font-style: italic;
    font-stretch: 75%;
    letter-spacing: calc(0.56 * var(--u));
  }

  .who {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: calc(6 * var(--u));
    min-width: 0;
  }

  .name {
    display: flex;
    overflow: hidden;
    align-items: flex-end;
    height: calc(33 * var(--u));
    padding-bottom: calc(2 * var(--u));
    color: var(--secondary);
    font-size: calc(16 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.32 * var(--u));
    line-height: 1;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .house {
    overflow: hidden;
    height: calc(17 * var(--u));
    color: #004281;
    font-size: calc(12 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.24 * var(--u));
    line-height: 1;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .score {
    display: flex;
    flex: none;
    align-items: flex-end;
    margin-right: calc(15 * var(--u));
  }

  .you .score {
    margin-right: 0;
  }

  .gem {
    display: block;
    flex: none;
    width: calc(33 * var(--u));
    height: calc(34.96 * var(--u));
    margin-bottom: calc(-1.96 * var(--u));
  }

  .tally {
    min-width: calc(21 * var(--u));
    padding-bottom: calc(4 * var(--u));
    color: var(--ink-shade);
    font-size: calc(20 * var(--u));
    font-style: italic;
    font-weight: 600;
    font-stretch: 75%;
    letter-spacing: calc(0.4 * var(--u));
    line-height: 1.05925;
    text-align: right;
  }

  .you .rank,
  .you .name,
  .you .house,
  .you .tally {
    color: var(--highlight);
  }
</style>
