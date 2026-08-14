<script lang="ts">
  import ListDivider from "../ui/ListDivider.svelte";
  import QuestCard from "../card/QuestCard.svelte";
  import type { Quest } from "$lib/quests.svelte";

  let {
    quests,
    daily,
    onscan,
  }: { quests: Quest[]; daily?: Quest | null; onscan?: (quest: Quest) => void } = $props();

  const now = Date.now();
  const open = $derived(quests.filter((quest) => Date.parse(quest.opensAt) <= now));
  const upcoming = $derived(quests.filter((quest) => Date.parse(quest.opensAt) > now));
</script>

<div class="list">
  <span class="rail" aria-hidden="true"></span>

  {#if daily}
    <QuestCard quest={daily} daily {onscan} />
  {/if}

  {#each open as quest (quest.id)}
    <QuestCard {quest} {onscan} />
  {/each}

  {#if upcoming.length > 0}
    {#if daily || open.length > 0}
      <div class="wide"><ListDivider label="Upcoming Challenges" /></div>
    {/if}

    {#each upcoming as quest (quest.id)}
      <QuestCard {quest} {onscan} />
    {/each}
  {/if}
</div>

<style>
  .list {
    position: relative;
    display: grid;
    align-items: start;
    gap: calc(17 * var(--u));
    grid-template-columns: repeat(auto-fill, minmax(calc(300 * var(--u)), 1fr));
  }

  .wide {
    grid-column: 1 / -1;
  }

  .rail {
    position: absolute;
    top: calc(-58 * var(--u));
    bottom: 0;
    left: calc(45 * var(--u));
    width: calc(4 * var(--u));
    background: color-mix(in srgb, var(--accent) 55%, transparent);
  }
</style>
