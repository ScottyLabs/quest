<script lang="ts">
  import NfcSheet from "$lib/components/quest/NfcSheet.svelte";
  import QuestHeader from "$lib/components/quest/QuestHeader.svelte";
  import QuestList from "$lib/components/quest/QuestList.svelte";
  import { fix } from "$lib/geo";
  import { NfcError, openSettings, readiness, scan, showsSystemSheet } from "$lib/nfc";
  import { warn } from "$lib/notice.svelte";
  import {
    BALANCE,
    CATEGORIES,
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

  let scanning = $state<Quest | null>(null);
  let abort: AbortController | null = null;

  async function beginScan(quest: Quest) {
    if (scanning !== null) return;

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

    // Settle the location prompt first: it cannot land over the NFC sheet.
    await fix();

    scanning = quest;
    abort = new AbortController();

    try {
      const url = await scan(`Hold your phone near the ${quest.title} tag`, abort.signal);
      if (url !== null) await handleTap(url, quest.id);
    } catch (error) {
      if (error instanceof NfcError || error instanceof TapError) warn(error.message);
      else warn("Couldn't register that tap.");
    } finally {
      scanning = null;
      abort = null;
    }
  }

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
      <QuestList quests={shown} onscan={beginScan} />
    {/if}
  </div>

  <span class="fade" style:opacity={fade} aria-hidden="true"></span>
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

  .quests {
    flex: 1;
    min-height: 0;
    padding: 28px 23px var(--dock-clear);
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
