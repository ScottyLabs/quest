<script lang="ts">
  import QuestCard from "./QuestCard.svelte";
  import type { Quest } from "$lib/quests.svelte";

  let { quests, onscan }: { quests: Quest[]; onscan?: (quest: Quest) => void } = $props();
</script>

<div class="list">
  <span class="rail" aria-hidden="true"></span>
  {#each quests as quest (quest.id)}
    <QuestCard {quest} {onscan} />
  {/each}
</div>

<style>
  .list {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .rail {
    position: absolute;
    top: 44px;
    bottom: 0;
    left: 40px;
    width: 3px;
    border-radius: 2px;
    background: linear-gradient(180deg, var(--highlight), var(--canvas));
  }
</style>
