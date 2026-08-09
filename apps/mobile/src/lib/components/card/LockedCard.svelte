<script lang="ts">
  import CardShell from "./CardShell.svelte";
  import QuestArt from "./QuestArt.svelte";
  import { unlockedAt, type Quest } from "$lib/quests.svelte";

  let { quest }: { quest: Quest } = $props();
</script>

<CardShell surface="#131f24" edge="color-mix(in srgb, #131f24 55%, #000000)">
  <QuestArt fill="#000000" />

  <span class="copy">
    <span class="title">{quest.title}</span>
    <span class="when">{unlockedAt(quest)}</span>
  </span>
</CardShell>

<style>
  .copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: calc(8 * var(--u));
    min-width: 0;
  }

  .title {
    overflow: hidden;
    color: var(--highlight);
    font-size: calc(16 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.32 * var(--u));
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .when {
    display: -webkit-box;
    overflow: hidden;
    color: #e2e2e2;
    font-size: calc(12 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.24 * var(--u));
    -webkit-box-orient: vertical;
    line-clamp: 2;
    -webkit-line-clamp: 2;
  }
</style>
