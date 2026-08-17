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

  const tile = $derived(quest.secret ? "#000000" : found.accent);
  const edge = $derived(quest.secret ? "#000000" : "var(--accent)");
  const icon = $derived(
    quest.secret
      ? "/img/quest/theme/secrets.svg"
      : (found.logo ?? "/img/quest/theme/all.svg"),
  );
</script>

<CardShell
  surface="var(--highlight)"
  {edge}
  label={quest.title}
  onclick={() => onscan?.(quest)}
>
  <QuestArt fill={tile} {icon} />
  <QuestCopy title={quest.title} detail={quest.detail} />
</CardShell>