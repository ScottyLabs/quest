<script lang="ts">
  import CardShell from "./CardShell.svelte";
  import DailyMark from "./DailyMark.svelte";
  import QuestArt from "./QuestArt.svelte";
  import QuestCopy from "./QuestCopy.svelte";
  import type { Quest } from "$lib/quests.svelte";

  let { quest, onscan }: { quest: Quest; onscan?: (quest: Quest) => void } = $props();

  // TODO: fix to be a parameter
  const NAVY = "#004281";
</script>

<DailyMark>
  <CardShell
    surface="var(--highlight)"
    edge={NAVY}
    label="Daily challenge: {quest.title}"
    onclick={() => onscan?.(quest)}
  >
    <QuestArt fill={NAVY} />
    <QuestCopy title={quest.title} detail={quest.detail} />
  </CardShell>
</DailyMark>
