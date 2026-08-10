<script lang="ts">
  import CardShell from "../card/CardShell.svelte";
  import DailyMark from "./DailyMark.svelte";
  import QuestArt from "../card/QuestArt.svelte";
  import QuestCopy from "../card/QuestCopy.svelte";
  import type { Quest } from "$lib/quests.svelte";
  import { theme } from "$lib/theme";

  let { quest, onscan }: { quest: Quest; onscan?: (quest: Quest) => void } = $props();

  const tile = $derived(theme(quest.category).accent);
</script>

<DailyMark>
  <CardShell
    surface="var(--highlight)"
    edge={tile}
    label="Daily challenge: {quest.title}"
    onclick={() => onscan?.(quest)}
  >
    <QuestArt fill={tile} />
    <QuestCopy title={quest.title} detail={quest.detail} />
  </CardShell>
</DailyMark>
