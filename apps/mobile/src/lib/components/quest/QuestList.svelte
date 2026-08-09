<script lang="ts">
  import ListDivider from "./ListDivider.svelte";
  import QuestCard from "./QuestCard.svelte";
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
      <ListDivider label="Upcoming Challenges" />
    {/if}

    {#each upcoming as quest (quest.id)}
      <QuestCard {quest} {onscan} />
    {/each}
  {/if}
</div>

<style>
  .list {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: calc(17 * var(--u));
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
