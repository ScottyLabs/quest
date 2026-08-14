<script lang="ts">
  import CarnegieCup from "$lib/components/leaderboard/CarnegieCup.svelte";
  import LeaderboardHeader from "$lib/components/leaderboard/LeaderboardHeader.svelte";
  import RankList from "$lib/components/leaderboard/RankList.svelte";
  import { boardFor, metric, toggleMetric } from "$lib/leaderboard.svelte";

  const board = $derived(boardFor(metric.id));
  const cup = $derived(board.data?.cup ?? null);
  const rows = $derived(board.data?.rows ?? []);

  $effect(() => {
    void boardFor(metric.id).ensure();
  });
</script>

<svelte:head><title>Leaderboard - Orientation Quest</title></svelte:head>

<div class="screen">
  <LeaderboardHeader metric={metric.id} ontoggle={toggleMetric} />

  {#if board.data === null && board.loading}
    <p class="note">Loading the standings&hellip;</p>
  {:else if board.data === null && board.error !== null}
    <p class="note">Couldn't reach the Orientation Quest server. Pull again in a moment.</p>
  {:else}
    <RankList {rows} metric={metric.id} />
  {/if}

  <CarnegieCup community={cup?.community ?? null} percent={cup?.percent ?? 0} />
</div>

<style>
  .screen {
    --notch: max(0px, calc(var(--safe-top) - 44 * var(--u)));

    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    background: var(--canvas);
  }


  .note {
    margin: calc(80 * var(--u)) calc(24 * var(--u));
    color: var(--tertiary);
    font-size: calc(14 * var(--u));
    font-weight: 600;
    text-align: center;
  }
</style>

