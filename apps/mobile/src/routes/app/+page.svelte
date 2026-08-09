<script lang="ts">
  import FilterMenu from "$lib/components/quest/FilterMenu.svelte";
  import NfcSheet from "$lib/components/quest/NfcSheet.svelte";
  import QuestHeader from "$lib/components/quest/QuestHeader.svelte";
  import QuestList from "$lib/components/quest/QuestList.svelte";
  import WaveEdge from "$lib/components/quest/WaveEdge.svelte";
  import { NEEDS_LOCATION, raise } from "$lib/caution.svelte";
  import { bucket, filters } from "$lib/filters.svelte";
  import { permitted } from "$lib/geo";
  import { NfcError, openSettings, readiness, scan, showsSystemSheet } from "$lib/nfc";
  import { warn } from "$lib/notice.svelte";
  import {
    CATEGORIES,
    DAILY,
    done,
    inCategory,
    nextUnlock,
    quests,
    TapError,
    type Quest,
  } from "$lib/quests.svelte";
  import { handleTap } from "$lib/tap";
  import { theme } from "$lib/theme";
  import { active } from "$lib/theme.svelte";
  import { refresh, wallet } from "$lib/wallet.svelte";

  let scanning = $state<Quest | null>(null);
  let abort: AbortController | null = null;
  let starting = false;

  async function beginScan(quest: Quest) {
    if (starting || scanning !== null) return;
    starting = true;

    try {
      const state = await readiness();
      if (state === "unsupported") {
        warn("This phone can't scan NFC tags.");
        return;
      }
      if (state === "disabled") {
        warn("Turn on NFC to scan this challenge.");
        await openSettings();
        return;
      }

      if (!(await permitted())) {
        raise(NEEDS_LOCATION);
        return;
      }

      scanning = quest;
      abort = new AbortController();

      try {
        const url = await scan(`Hold your phone near the ${quest.title} tag`, abort.signal);
        if (url !== null) await handleTap(url);
      } catch (error) {
        if (error instanceof NfcError || error instanceof TapError) warn(error.message);
        else warn("Couldn't register that tap.");
      } finally {
        scanning = null;
        abort = null;
      }
    } finally {
      starting = false;
    }
  }

  const all = $derived(quests.data ?? []);
  const shown = $derived(inCategory(all, active.id));
  const visible = $derived(shown.filter((quest) => filters[bucket(quest, Date.now())]));
  const daily = $derived(filters[bucket(DAILY, Date.now())] ? DAILY : null);
  const completed = $derived(done(shown));
  const cold = $derived(quests.data === null);

  let filtering = $state(false);
  let scroller = $state<HTMLElement | null>(null);

  $effect(() => {
    const category = active.id;
    if (scroller && category) scroller.scrollTop = 0;
  });

  $effect(() => {
    void quests.reload();
    void refresh();

    const wake = () => {
      if (document.visibilityState !== "visible") return;
      void quests.ensure();
      void refresh();
    };

    document.addEventListener("visibilitychange", wake);
    const beat = setInterval(() => {
      void quests.ensure();
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
  total={shown.length}
  balance={wallet.scottycoins}
  stones={wallet.thistlestones}
  onfilter={() => (filtering = !filtering)}
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
      <QuestList quests={visible} {daily} onscan={beginScan} />
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
</div>

{#if scanning && !showsSystemSheet}
  <NfcSheet title={scanning.title} oncancel={() => abort?.abort()} />
{/if}

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
    margin: calc(24 * var(--u)) 0 0;
    color: var(--shade);
    font-size: calc(15 * var(--u));
    font-weight: 600;
    text-align: center;
  }
</style>
