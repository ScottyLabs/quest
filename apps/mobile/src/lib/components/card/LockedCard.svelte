<script lang="ts">
  import { unlockedAt, type Quest } from "$lib/quests.svelte";
  import CardShell from "./CardShell.svelte";
  import QuestArt from "./QuestArt.svelte";

  let { quest, onscan }: { quest: Quest; onscan?: (quest: Quest) => void } = $props();
</script>

<CardShell
  surface="#131f24"
  edge="color-mix(in srgb, #131f24 55%, #000000)"
  label={onscan === undefined ? undefined : `Provision ${quest.title}`}
  onclick={onscan === undefined ? undefined : () => onscan(quest)}
>
  <QuestArt fill="#000000" icon="/img/quest/lock_challenge.svg" />

  <span class="copy">
    <span class="title">????</span>
    <span class="when">{unlockedAt(quest)}</span>
    {#if onscan !== undefined}
      <span class="provision">Tap to link a card</span>
    {/if}
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

  .provision {
    align-self: flex-start;
    padding: calc(2 * var(--u)) calc(8 * var(--u));
    border: 1px solid #6f8b96;
    border-radius: calc(20 * var(--u));
    color: #bcd6e0;
    font-size: calc(10 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.4 * var(--u));
    text-transform: uppercase;
    white-space: nowrap;
  }
</style>
