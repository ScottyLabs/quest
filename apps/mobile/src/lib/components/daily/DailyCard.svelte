<script lang="ts">
  import CardShell from "../card/CardShell.svelte";
  import DailyMark from "./DailyMark.svelte";
  import QuestArt from "../card/QuestArt.svelte";
  import QuestCopy from "../card/QuestCopy.svelte";
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
