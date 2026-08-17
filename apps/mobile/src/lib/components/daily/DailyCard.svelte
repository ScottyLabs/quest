<script lang="ts">
  import type { Quest } from "$lib/quests.svelte";
  import { theme } from "$lib/theme";
  import CardShell from "../card/CardShell.svelte";
  import QuestArt from "../card/QuestArt.svelte";
  import QuestCopy from "../card/QuestCopy.svelte";
  import DailyMark from "./DailyMark.svelte";

  let {
    quest,
    onscan,
  }: {
    quest: Quest;
    onscan?: (quest: Quest) => void;
  } = $props();

  const found = $derived(theme(quest.category));
</script>

<DailyMark>
  <CardShell
    surface="var(--highlight)"
    edge={found.accent}
    label="Daily challenge: {quest.title}"
    onclick={() => onscan?.(quest)}
  >
    <QuestArt
      fill={found.accent}
      icon={found.logo ?? "/img/quest/theme/all.svg"}
    />
    <QuestCopy title={quest.title} detail={quest.detail} />
  </CardShell>
</DailyMark>