<script lang="ts">
  import CardShell from "./CardShell.svelte";
  import { celebrate } from "$lib/celebrate.svelte";
  import type { Quest } from "$lib/quests.svelte";

  let { quest }: { quest: Quest } = $props();

  const reopen = () =>
    celebrate({
      id: quest.id,
      name: quest.title,
      description: quest.description || quest.detail,
      reward: quest.reward,
      place: null,
    });
</script>

<CardShell
  surface="var(--quest-done)"
  edge="var(--quest-done-ink)"
  label="{quest.title}, cleared"
  onclick={reopen}
>
  <img src="/img/quest/badge-done.svg" alt="Completed" />
  <h2>{quest.title}</h2>
</CardShell>

<style>
  img {
    display: block;
    flex: none;
    width: calc(59 * var(--u));
    height: calc(56 * var(--u));
  }

  h2 {
    overflow: hidden;
    margin: 0;
    color: var(--quest-done-ink);
    font-size: calc(20 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.4 * var(--u));
    text-decoration: line-through;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
