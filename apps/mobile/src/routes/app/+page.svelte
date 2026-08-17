<script lang="ts">
  import FilterMenu from "$lib/components/board/FilterMenu.svelte";
  import HintBar from "$lib/components/board/HintBar.svelte";
  import QuestHeader from "$lib/components/board/QuestHeader.svelte";
  import QuestList from "$lib/components/board/QuestList.svelte";
  import WaveEdge from "$lib/components/ui/WaveEdge.svelte";
  import { bucket, filters } from "$lib/filters.svelte";
  import {
      assignment,
      CATEGORIES,
      countedTotal,
      done,
      inCategory,
      nextUnlock,
      quests,
      type Quest,
  } from "$lib/quests.svelte";
  import { matches, search } from "$lib/search.svelte";
  import { tapScan } from "$lib/tap";
  import { FALLBACK, theme, vars } from "$lib/theme";
  import { active } from "$lib/theme.svelte";
  import { gemDay, refresh, wallet } from "$lib/wallet.svelte";

  async function beginScan(quest: Quest) {
    await tapScan(quest.title, null, quest.id);
  }

  const all = $derived(quests.data ?? []);
  const shown = $derived(inCategory(all, active.id));
  const daily = $derived.by(() => {
    const quest = assignment.quest;
    if (quest === null) return null;
    if (active.id !== FALLBACK && active.id !== quest.category) return null;

    const kept = filters[bucket(quest, Date.now())] && matches(quest, search.query);
    return kept ? quest : null;
  });
  // Drop it from the ordinary list: it is a real challenge, so without this it
  // renders twice wherever the daily card shows.
  const visible = $derived(
    shown.filter(
      (quest) =>
        quest.id !== daily?.id &&
        filters[bucket(quest, Date.now())] &&
        matches(quest, search.query),
    ),
  );

  const normalVisible = $derived(visible.filter((quest) => !quest.secret));
const secretVisible = $derived(visible.filter((quest) => quest.secret));

  const completed = $derived(done(shown));
  const cold = $derived(quests.data === null);

  let filtering = $state(false);
  let hinting = $state(false);
  let scroller = $state<HTMLElement | null>(null);
  let hintClosedAt = 0;

  $effect(() => {
    const category = active.id;
    if (scroller && category) scroller.scrollTop = 0;
  });

  const settled = () => {
    if (assignment.day !== null && assignment.day !== gemDay()) return quests.reload();
    return quests.ensure();
  };

  $effect(() => {
    void quests.reload();
    void refresh();

    const wake = () => {
      if (document.visibilityState !== "visible") return;
      void settled();
      void refresh();
    };

    document.addEventListener("visibilitychange", wake);
    const beat = setInterval(() => {
      void settled();
      void refresh();
    }, 60_000);

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

<svelte:head><title>{theme(active.id).label} - Orientation Quest</title></svelte:head>

<QuestHeader
  theme={theme(active.id)}
  categories={CATEGORIES}
  current={active.id}
  onpick={(id) => (active.id = id)}
  done={completed}
  total={countedTotal(shown)}
  balance={wallet.scottycoins}
  gems={wallet.gems}
  onfilter={() => (filtering = !filtering)}
  oninfo={() => {
    if (Date.now() - hintClosedAt > 300) hinting = true;
  }}
  infoOn={hinting}
/>

<div class="board">
  <span class="vignette left" aria-hidden="true"></span>
  <span class="vignette right" aria-hidden="true"></span>
  <span class="band"><WaveEdge shape="band" /></span>

  <div class="quests" bind:this={scroller}>
    {#if cold && quests.loading}
      <p class="note">Loading challenges&hellip;</p>
    {:else if cold && quests.error !== null}
      <p class="note">Couldn't reach the Orientation Quest server. Pull again in a moment.</p>
    {:else}
      <QuestList quests={normalVisible} {daily} onscan={beginScan} />

{#if active.id === FALLBACK && secretVisible.length > 0}
  <div class="secret-gap" aria-hidden="true"></div>

  <div class="secret-list" style={vars(theme("secrets"))}>
    <QuestList quests={secretVisible} daily={null} onscan={beginScan} />
  </div>
{/if}
      {#if visible.length === 0}
        <p class="note">
          {shown.length === 0 ? "No challenges here yet." : "Nothing matches those filters."}
        </p>
      {/if}
    {/if}
  </div>

  <span class="scrim" aria-hidden="true"></span>

  {#if filtering}
    <FilterMenu onclose={() => (filtering = false)} />
  {/if}

  {#if hinting}
    <HintBar
      text={theme(active.id).hint}
      onclose={() => {
        hinting = false;
        hintClosedAt = Date.now();
      }}
    />
  {/if}
</div>

<style>
  .board {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .vignette {
    position: absolute;
    top: 0;
    width: 40.1%;
    height: calc(561 * var(--u));
    opacity: 0.215;
    pointer-events: none;
  }

  .left {
    left: 0;
    background: linear-gradient(90deg, var(--tint), transparent);
  }

  .right {
    right: 0;
    background: linear-gradient(270deg, var(--tint), transparent);
  }

  .band {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: calc(57 * var(--u));
    overflow: hidden;
    color: var(--sink);
    pointer-events: none;
  }

  .band > :global(svg) {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: calc(361 * var(--u));
  }

  .quests {
    position: relative;
    flex: 1;
    min-height: 0;
    padding: calc(58 * var(--u)) calc(23 * var(--u)) var(--dock-clear);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .scrim {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: calc(30 * var(--u));
    background: linear-gradient(180deg, rgb(0 0 0 / 0.26), transparent);
    pointer-events: none;
  }

  .note {
    max-width: var(--column);
    margin: calc(24 * var(--u)) auto 0;
    color: var(--shade);
    font-size: calc(15 * var(--u));
    font-weight: 600;
    text-align: center;
  }

  .secret-gap {
  height: 85vh;
}

.secret-list {
  --highlight: #111111;
  --quest-done: #111111;
  --quest-done-ink: #ffffff;

  padding-top: calc(8 * var(--u));
}
</style>
