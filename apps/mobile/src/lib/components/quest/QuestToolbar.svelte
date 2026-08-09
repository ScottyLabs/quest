<script lang="ts">
  import ToolbarButton from "./ToolbarButton.svelte";
  import ToolbarStat from "./ToolbarStat.svelte";
  import { filters } from "$lib/filters.svelte";
  import { DAILY_STONES } from "$lib/wallet.svelte";

  let {
    balance,
    stones,
    onsearch,
    onfilter,
    oninfo,
  }: {
    balance: number;
    stones: number;
    onsearch?: () => void;
    onfilter?: () => void;
    oninfo?: () => void;
  } = $props();

  const narrowed = $derived(!(filters.challenges && filters.completed && filters.locked));
</script>

<div class="bar">
  <ToolbarButton
    icon="/img/quest/search.svg"
    label="Search challenges"
    width={27}
    height={28}
    onclick={onsearch}
  />

  <ToolbarButton
    icon={narrowed ? "/img/quest/funnel-on.svg" : "/img/quest/funnel.svg"}
    label="Filter challenges"
    width={29}
    height={28}
    onclick={onfilter}
  />

  <div class="stats">
    <ToolbarStat
      icon="/img/quest/stat-cleared.svg"
      label="Thistlestones"
      value="{stones}/{DAILY_STONES}"
      width={30}
      height={30}
    />

    <ToolbarStat
      icon="/img/quest/stat-coin.svg"
      label="ScottyCoins"
      value={String(balance)}
      width={30}
      height={32}
    />
  </div>

  <span class="spacer"></span>

  <ToolbarButton
    icon="/img/quest/info.svg"
    label="About challenges"
    width={32}
    height={32}
    disc
    onclick={oninfo}
  />
</div>

<style>
  .bar {
    position: relative;
    display: flex;
    align-items: center;
    gap: calc(16 * var(--u));
    height: calc(65 * var(--u));
    padding: calc(7 * var(--u)) calc(26 * var(--u)) 0 calc(33 * var(--u));
    background: var(--highlight);
    box-shadow:
      0 calc(3 * var(--u)) 0 rgb(63 65 67 / 0.2),
      0 calc(12 * var(--u)) calc(16 * var(--u)) calc(-8 * var(--u)) rgb(0 0 0 / 0.35);
  }

  .stats {
    display: flex;
    align-items: center;
    gap: calc(12 * var(--u));
  }

  .spacer {
    flex: 1;
  }
</style>
