<script lang="ts">
  import CategoryChips from "./CategoryChips.svelte";
  import CategoryMedallion from "./CategoryMedallion.svelte";
  import StatPill from "./StatPill.svelte";
  import ScottyCoin from "$lib/components/ScottyCoin.svelte";
  import type { Theme } from "$lib/theme";

  let {
    theme,
    categories,
    current,
    onpick,
    done,
    total,
    balance,
  }: {
    theme: Theme;
    categories: string[];
    current: string;
    onpick: (id: string) => void;
    done: number;
    total: number;
    balance: number;
  } = $props();
</script>

<header>
  <span class="wave" aria-hidden="true"></span>

  <div class="top">
    <StatPill value="{done}/{total}" label="Completed">
      {#snippet leading()}
        <img src="/img/quest/flag.svg" alt="" width="21" height="21" />
      {/snippet}
    </StatPill>

    <div class="medallion"><CategoryMedallion {theme} /></div>

    <StatPill value={String(balance)} label="ScottyCoins">
      {#snippet leading()}
        <ScottyCoin size={30} alt="" />
      {/snippet}
    </StatPill>
  </div>

  <div class="title">
    <img src="/img/quest/filter-lines.svg" alt="" width="21" height="21" />
    <h1>{theme.label}</h1>
    <img src="/img/quest/info-circle.svg" alt="" width="18" height="18" />
  </div>

  <div class="chips">
    <CategoryChips {categories} {current} {onpick} />
  </div>
</header>

<style>
  header {
    position: relative;
    flex: none;
    padding-top: calc(14px + env(safe-area-inset-top));
  }

  .wave {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    width: 100%;
    aspect-ratio: 439 / 184;
    background: var(--accent);
    -webkit-mask: url("/img/quest/header-wave.svg") no-repeat top center / 100% 100%;
    mask: url("/img/quest/header-wave.svg") no-repeat top center / 100% 100%;
  }

  .top,
  .title,
  .chips {
    position: relative;
  }

  .top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0 18px;
  }

  .medallion {
    margin-top: -10px;
  }

  .title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 18px;
  }

  .chips {
    margin-top: 8px;
  }

  h1 {
    margin: 0;
    overflow: hidden;
    color: var(--highlight);
    font-size: 21px;
    font-weight: 700;
    letter-spacing: 0.42px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
