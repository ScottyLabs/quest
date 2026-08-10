<script lang="ts">
  import { TABS, type TradeTab } from "$lib/trade.svelte";

  let { current, onpick }: { current: TradeTab; onpick: (id: TradeTab) => void } = $props();
</script>

<nav aria-label="Terrier Trade sections">
  {#each TABS as entry (entry.id)}
    {@const on = entry.id === current}
    {@const state = on ? "on" : "off"}
    <button
      class="tab {entry.id}"
      class:on
      type="button"
      aria-current={on ? "page" : undefined}
      onclick={() => onpick(entry.id)}
    >
      <img class="shadow" src="/img/trade/{entry.id}-shadow-{state}.svg" alt="" />
      <img class="face" src="/img/trade/{entry.id}-face-{state}.svg" alt="" />
      <span class="label">{entry.label}</span>
      {#if entry.id === "ticket"}
        <img class="barcode" src="/img/trade/barcode.svg" alt="" />
      {/if}
    </button>
  {/each}
</nav>

<style>
  nav {
    position: absolute;
    z-index: 3;
    inset: 0;
  }

  .tab {
    position: absolute;
    inset: 0;
    padding: 0;
    border: 0;
    background: none;
    color: var(--highlight);
    font: inherit;
    pointer-events: none;
  }

  .tab img,
  .tab .label {
    position: absolute;
  }

  .tab .face,
  .tab .label,
  .tab .barcode {
    cursor: pointer;
    pointer-events: auto;
  }

  .tab.on {
    z-index: 2;
  }

  .label {
    font-style: italic;
    font-weight: 600;
    font-stretch: 75%;
    text-align: right;
    white-space: nowrap;
  }

  .shop .shadow {
    top: calc(199 * var(--u) + var(--notch));
    left: calc(-52.86 * var(--u));
    width: calc(211.866 * var(--u));
    height: calc(137.988 * var(--u));
  }

  .shop .face {
    top: calc(177.5 * var(--u) + var(--notch));
    left: calc(-59.13 * var(--u));
    width: calc(207.136 * var(--u));
    height: calc(143.955 * var(--u));
  }

  .shop .label {
    top: calc(196 * var(--u) + var(--notch));
    right: calc(335 * var(--u));
    font-size: calc(36 * var(--u));
    letter-spacing: calc(0.72 * var(--u));
  }

  .receipt .shadow {
    top: calc(178.5 * var(--u) + var(--notch));
    left: calc(170.5 * var(--u));
    width: calc(156.097 * var(--u));
    height: calc(81.52 * var(--u));
  }

  .receipt .face {
    top: calc(172 * var(--u) + var(--notch));
    left: calc(168.5 * var(--u));
    width: calc(156.173 * var(--u));
    height: calc(78.021 * var(--u));
  }

  .receipt.on .shadow {
    top: calc(179 * var(--u) + var(--notch));
    left: calc(171 * var(--u));
    width: calc(147 * var(--u));
    height: calc(82 * var(--u));
  }

  .receipt.on .face {
    top: calc(171 * var(--u) + var(--notch));
    left: calc(168 * var(--u));
    width: calc(142 * var(--u));
    height: calc(78 * var(--u));
  }

  .receipt .label {
    top: calc(187 * var(--u) + var(--notch));
    right: calc(136 * var(--u));
    font-size: calc(32 * var(--u));
    letter-spacing: calc(0.64 * var(--u));
  }

  .ticket .shadow {
    top: calc(195.5 * var(--u) + var(--notch));
    left: calc(347.5 * var(--u));
    width: calc(139.915 * var(--u));
    height: calc(90.5 * var(--u));
  }

  .ticket .face {
    top: calc(170 * var(--u) + var(--notch));
    left: calc(320 * var(--u));
    width: calc(158 * var(--u));
    height: calc(102 * var(--u));
  }

  .ticket.on .shadow {
    top: calc(162 * var(--u) + var(--notch));
    left: calc(320 * var(--u));
    width: calc(148 * var(--u));
    height: calc(124 * var(--u));
  }

  .ticket.on .face {
    left: calc(306 * var(--u));
  }

  .ticket .label {
    top: calc(180 * var(--u) + var(--notch));
    right: calc(6 * var(--u));
    font-size: calc(32 * var(--u));
    letter-spacing: calc(0.64 * var(--u));
    rotate: 5.38deg;
  }

  .ticket.on .label {
    right: calc(20 * var(--u));
  }

  .barcode {
    top: calc(228.07 * var(--u) + var(--notch));
    left: calc(366.73 * var(--u));
    width: calc(62.236 * var(--u));
    height: calc(23.874 * var(--u));
    rotate: 7.85deg;
  }

  .ticket.on .barcode {
    left: calc(355.98 * var(--u));
  }
</style>
