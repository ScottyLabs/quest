<script lang="ts">
  import DailyCard from "../daily/DailyCard.svelte";
  import DoneCard from "./DoneCard.svelte";
  import LockedCard from "./LockedCard.svelte";
  import OpenCard from "./OpenCard.svelte";
  import type { Quest } from "$lib/quests.svelte";

  let {
    quest,
    daily = false,
    onscan,
  }: { quest: Quest; daily?: boolean; onscan?: (quest: Quest) => void } = $props();

  const locked = $derived(Date.parse(quest.opensAt) > Date.now());
</script>

{#if quest.state === "done"}
  <DoneCard {quest} />
{:else if daily}
  <DailyCard {quest} {onscan} />
{:else if locked}
  <LockedCard {quest} />
{:else}
  <OpenCard {quest} {onscan} />
{/if}
