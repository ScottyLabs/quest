<script lang="ts">
  import { tick } from "svelte";
  import ToolbarButton from "./ToolbarButton.svelte";
  import ToolbarStat from "./ToolbarStat.svelte";
  import { filters } from "$lib/filters.svelte";
  import { search } from "$lib/search.svelte";
  import { DAILY_GEMS } from "$lib/wallet.svelte";

  let {
    balance,
    gems,
    onfilter,
    oninfo,
    infoOn = false,
  }: {
    balance: number;
    gems: number;
    onfilter?: () => void;
    oninfo?: () => void;
    infoOn?: boolean;
  } = $props();

  const narrowed = $derived(!(filters.challenges && filters.completed && filters.locked));
  const funnel = $derived(narrowed ? "/img/quest/funnel-on.svg" : "/img/quest/funnel.svg");

  let field = $state<HTMLInputElement | null>(null);

  function open(): void {
    search.open = true;
    void tick().then(() => field?.focus());
  }

  function close(): void {
    search.open = false;
    search.query = "";
  }
</script>

<div class="dock">
  <div class="bar" class:searching={search.open}>
  <div class="face tools" inert={search.open}>
    <ToolbarButton
      icon="/img/quest/search.svg"
      label="Search challenges"
      width={27}
      height={28}
      onclick={open}
    />

    <ToolbarButton
      icon={funnel}
      label="Filter challenges"
      width={29}
      height={28}
      onclick={onfilter}
    />

    <div class="stats">
      <ToolbarStat
        icon="/img/quest/stat-cleared.svg"
        label="Gems"
        value="{gems}/{DAILY_GEMS}"
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
      on={infoOn}
      onclick={oninfo}
    />
  </div>

  <div class="face find" inert={!search.open}>
    <ToolbarButton
      icon="/img/quest/back.svg"
      label="Close search"
      width={16}
      height={28}
      onclick={close}
    />

    <input
      bind:this={field}
      bind:value={search.query}
      type="search"
      enterkeyhint="search"
      autocomplete="off"
      autocapitalize="none"
      spellcheck="false"
      placeholder="Search challenges"
      aria-label="Search challenges"
      onkeydown={(event) => {
        if (event.key === "Escape") close();
      }}
    />

    <ToolbarButton
      icon={funnel}
      label="Filter challenges"
      width={29}
      height={28}
      onclick={onfilter}
    />
    </div>
  </div>
</div>

<style>
  .dock {
    position: relative;
    height: calc(65 * var(--u));
  }

  .bar {
    position: absolute;
    inset: 0;
    border-radius: 0;
    background: var(--highlight);
    box-shadow:
      0 calc(3 * var(--u)) 0 rgb(63 65 67 / 0.2),
      0 calc(12 * var(--u)) calc(16 * var(--u)) calc(-8 * var(--u)) rgb(0 0 0 / 0.35);
    transition:
      inset 260ms ease,
      border-radius 260ms ease;
  }

  .searching {
    inset: calc(12 * var(--u)) calc(16 * var(--u)) 0;
    border-radius: calc(18 * var(--u));
  }

  .face {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    transition: opacity 180ms ease;
  }

  .tools {
    gap: calc(16 * var(--u));
    padding: calc(7 * var(--u)) calc(26 * var(--u)) 0 calc(33 * var(--u));
  }

  .find {
    gap: calc(20 * var(--u));
    padding: 0 calc(16 * var(--u)) 0 calc(19 * var(--u));
  }

  .bar:not(.searching) .find,
  .searching .tools {
    opacity: 0;
  }

  input {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: none;
    color: var(--secondary);
    font: inherit;
    font-size: max(16px, calc(24 * var(--u)));
    font-weight: 600;
  }

  input::placeholder {
    color: #808080;
  }

  input::-webkit-search-cancel-button {
    display: none;
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
