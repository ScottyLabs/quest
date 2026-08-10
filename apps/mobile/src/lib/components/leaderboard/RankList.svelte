<script lang="ts">
  import JumpToMe from "./JumpToMe.svelte";
  import RankRow from "./RankRow.svelte";
  import type { Metric, Standing } from "$lib/leaderboard.svelte";

  let { rows, metric }: { rows: Standing[]; metric: Metric } = $props();

  let scroller = $state<HTMLElement | null>(null);
  let anchor = $state<HTMLElement | null>(null);
  let adrift = $state(false);
  let heading = $state<"up" | "down">("down");

  const mine = $derived(rows.find((row) => row.you) ?? null);

  $effect(() => {
    const list = scroller;
    const target = anchor;
    if (list === null || target === null) return;

    const track = () => {
      const seen = list.getBoundingClientRect();
      const row = target.getBoundingClientRect();
      const margin = seen.height * 0.12;

      adrift = row.bottom < seen.top + margin || row.top > seen.bottom - margin;
      heading = row.top < seen.top ? "up" : "down";
    };

    track();
    list.addEventListener("scroll", track, { passive: true });

    return () => list.removeEventListener("scroll", track);
  });
</script>

<ol class="list" bind:this={scroller}>
  {#each rows as row (row.rank)}
    {#if row.you}
      <li bind:this={anchor}><RankRow {row} {metric} /></li>
    {:else}
      <li><RankRow {row} {metric} /></li>
    {/if}
  {/each}
</ol>

{#if mine !== null && adrift}
  <JumpToMe
    rank={mine.rank}
    score={mine.score}
    {metric}
    {heading}
    onjump={() => anchor?.scrollIntoView({ block: "center", behavior: "smooth" })}
  />
{/if}

<style>
  .list {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    margin: 0;
    padding: calc(70 * var(--u)) 0 var(--dock-clear);
    overflow-y: auto;
    list-style: none;
    overscroll-behavior: contain;
    scroll-padding: calc(120 * var(--u)) 0;
  }

  li {
    flex: none;
  }
</style>
