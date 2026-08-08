<script lang="ts">
  import QuestCard from "./QuestCard.svelte";
  import type { Quest } from "$lib/quests.svelte";

  let {
    quests,
    daily,
    onscan,
  }: { quests: Quest[]; daily?: Quest | null; onscan?: (quest: Quest) => void } = $props();
</script>

<div class="list">
  <span class="rail" aria-hidden="true"></span>

  {#if daily}
    <QuestCard quest={daily} daily {onscan} />
  {/if}

  {#each quests as quest (quest.id)}
    <QuestCard {quest} {onscan} />
  {/each}
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
