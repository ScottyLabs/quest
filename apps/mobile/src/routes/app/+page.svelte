<script lang="ts">
  import QuestHeader from "$lib/components/quest/QuestHeader.svelte";
  import QuestList from "$lib/components/quest/QuestList.svelte";
  import { BALANCE, CATEGORIES, done, inCategory, nextUnlock, quests } from "$lib/quests.svelte";
  import { theme } from "$lib/theme";
  import { active } from "$lib/theme.svelte";

  const all = $derived(quests.data ?? []);
  const shown = $derived(inCategory(all, active.id));
  const completed = $derived(done(shown));
  const cold = $derived(quests.data === null);

  let scroller = $state<HTMLElement | null>(null);
  let top = $state(0);

  const fade = $derived(Math.min(top / 64, 1));

  $effect(() => {
    const category = active.id;
    if (scroller && category) {
      scroller.scrollTop = 0;
      top = 0;
    }
  });

  $effect(() => {
    void quests.reload();

    const wake = () => {
      if (document.visibilityState === "visible") void quests.ensure();
    };

    document.addEventListener("visibilitychange", wake);
    const beat = setInterval(() => void quests.ensure(), 60_000);

    return () => {
      document.removeEventListener("visibilitychange", wake);
      clearInterval(beat);
    };
  });

  $effect(() => {
    const at = nextUnlock(all, Date.now());
    if (at === null) return;

    const delay = Math.min(Math.max(at - Date.now(), 0), 2_147_483_647);
    const timer = setTimeout(() => void quests.reload(), delay);
    return () => clearTimeout(timer);
  });
</script>

<svelte:head><title>{theme(active.id).label} - Quest</title></svelte:head>

<QuestHeader
  theme={theme(active.id)}
  categories={CATEGORIES}
  current={active.id}
  onpick={(id) => (active.id = id)}
  done={completed}
  total={shown.length}
  balance={BALANCE}
/>

<div class="board">
  <div class="quests" bind:this={scroller} onscroll={() => (top = scroller?.scrollTop ?? 0)}>
    {#if cold && quests.loading}
      <p class="note">Loading challenges&hellip;</p>
    {:else if cold && quests.error !== null}
      <p class="note">Couldn't reach the quest server. Pull again in a moment.</p>
    {:else if shown.length === 0}
      <p class="note">No challenges here yet.</p>
    {:else}
      <QuestList quests={shown} onclaim={() => void quests.reload()} />
    {/if}
  </div>

  <span class="fade" style:opacity={fade} aria-hidden="true"></span>
</div>

<style>
  .board {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .quests {
    flex: 1;
    min-height: 0;
    padding: 28px 23px 110px;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .fade {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: 44px;
    background: linear-gradient(180deg, var(--canvas) 15%, transparent);
    pointer-events: none;
  }

  .note {
    margin: 24px 0 0;
    color: var(--shade);
    font-size: 15px;
    font-weight: 600;
    text-align: center;
  }
</style>
