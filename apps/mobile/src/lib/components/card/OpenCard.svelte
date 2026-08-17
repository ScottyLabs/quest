<script lang="ts">
  import type { Quest } from "$lib/quests.svelte";
  import { theme } from "$lib/theme";
  import CardShell from "./CardShell.svelte";
  import QuestArt from "./QuestArt.svelte";
  import QuestCopy from "./QuestCopy.svelte";

  let {
    quest,
    onscan,
  }: {
    quest: Quest;
    onscan?: (quest: Quest) => void;
  } = $props();

  const found = $derived(theme(quest.category));
</script>

<CardShell
  surface="var(--highlight)"
  edge="var(--accent)"
  label={quest.title}
  onclick={() => onscan?.(quest)}
>
  <QuestArt
    fill={found.accent}
    icon={found.logo ?? "/img/quest/theme/all.svg"}
  />
  <QuestCopy title={quest.title} detail={quest.detail} />
</CardShell>