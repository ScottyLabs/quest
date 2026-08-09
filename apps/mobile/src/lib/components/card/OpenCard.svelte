<script lang="ts">
  import CardShell from "./CardShell.svelte";
  import QuestArt from "./QuestArt.svelte";
  import QuestCopy from "./QuestCopy.svelte";
  import type { Quest } from "$lib/quests.svelte";
  import { theme } from "$lib/theme";

  let { quest, onscan }: { quest: Quest; onscan?: (quest: Quest) => void } = $props();

  const tile = $derived(theme(quest.category).accent);
</script>

<CardShell
  surface="var(--highlight)"
  edge="var(--accent)"
  label={quest.title}
  onclick={() => onscan?.(quest)}
>
  <QuestArt fill={tile} />
  <QuestCopy title={quest.title} detail={quest.detail} />
</CardShell>
