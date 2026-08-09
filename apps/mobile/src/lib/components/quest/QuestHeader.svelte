<script lang="ts">
  import CategoryChips from "./CategoryChips.svelte";
  import CategoryCrest from "./CategoryCrest.svelte";
  import QuestTally from "./QuestTally.svelte";
  import QuestToolbar from "./QuestToolbar.svelte";
  import WaveEdge from "./WaveEdge.svelte";
  import { search } from "$lib/search.svelte";
  import type { Theme } from "$lib/theme";

  let {
    theme,
    categories,
    current,
    onpick,
    done,
    total,
    balance,
    gems,
    onfilter,
    oninfo,
    infoOn,
  }: {
    theme: Theme;
    categories: string[];
    current: string;
    onpick: (id: string) => void;
    done: number;
    total: number;
    balance: number;
    gems: number;
    onfilter?: () => void;
    oninfo?: () => void;
    infoOn?: boolean;
  } = $props();

  const lines = $derived((theme.title ?? theme.label).split("\n"));
</script>

<header>
  <div class="crown">
    <CategoryCrest {theme} />

    <h1>
      {#if theme.mark}
        <img
          class="mark"
          src={theme.mark.src}
          alt=""
          style:--mx="calc({theme.mark.x} * var(--u))"
          style:--my="calc({theme.mark.y} * var(--u))"
          style:--mw="calc({theme.mark.w} * var(--u))"
        />
      {/if}
      {#each lines as line, i (i)}
        <span class="line">{line}</span>
      {/each}
    </h1>

    <QuestTally {done} {total} />
  </div>

  <div class="chips">
    <CategoryChips {categories} {current} {onpick} />
  </div>

  <QuestToolbar {balance} {gems} {onfilter} {oninfo} {infoOn} />

  <span class="veil" class:hidden={search.open}><WaveEdge shape="veil" /></span>
  <span class="crown-fade" aria-hidden="true"></span>
</header>

<style>
  header {
    position: relative;
    z-index: 2;
    flex: none;
    padding-top: calc(var(--safe-top) + 12 * var(--u));
    background: var(--crown);
  }

  .veil {
    position: absolute;
    right: 0;
    bottom: calc(8 * var(--u));
    left: 0;
    z-index: 2;
    height: calc(296 * var(--u));
    color: var(--veil);
    pointer-events: none;
    transition: opacity 220ms ease;
  }

  .veil.hidden {
    opacity: 0;
  }

  .crown-fade {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 3;
    height: calc(var(--safe-top) + 137 * var(--u));
    background:
      linear-gradient(180deg, var(--crown), var(--sink)) bottom / 100% calc(187 * var(--u))
        no-repeat,
      var(--crown);
    pointer-events: none;
  }

  .crown {
    position: relative;
    z-index: 4;
    display: flex;
    align-items: flex-end;
    gap: calc(10 * var(--u));
    min-height: calc(101 * var(--u));
    padding: 0 calc(86 * var(--u)) 0 calc(24 * var(--u));
  }

  .chips {
    position: relative;
    z-index: 4;
    margin: calc(42 * var(--u)) 0 calc(10 * var(--u));
  }

  h1 {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-self: center;
    min-width: 0;
    margin: 0;
    color: var(--highlight);
    font-size: calc(32 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.64 * var(--u));
    line-height: 1.36;
  }

  .line {
    position: relative;
    z-index: 1;
  }

  .mark {
    position: absolute;
    top: var(--my);
    left: var(--mx);
    width: var(--mw);
  }
</style>
