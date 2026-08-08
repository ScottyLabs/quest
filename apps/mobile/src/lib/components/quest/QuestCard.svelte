<script lang="ts">
  import DailyCard from "./DailyCard.svelte";
  import DoneCard from "./DoneCard.svelte";
  import OpenCard from "./OpenCard.svelte";
  import type { Quest } from "$lib/quests.svelte";

  let {
    quest,
    daily = false,
    onscan,
  }: { quest: Quest; daily?: boolean; onscan?: (quest: Quest) => void } = $props();
</script>

{#if quest.state === "done"}
  <DoneCard {quest} />
{:else if daily}
  <DailyCard {quest} {onscan} />
{:else}
  <OpenCard {quest} {onscan} />
{/if}
