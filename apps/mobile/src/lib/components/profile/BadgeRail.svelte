<script lang="ts">
  import { fade } from "svelte/transition";
  import { held, type Badge, type BadgeRow, type Progress } from "$lib/badges";

  let {
    row,
    progress,
    open = $bindable(null),
  }: {
    row: BadgeRow;
    progress: Progress;
    open?: string | null;
  } = $props();

  const LINGER = 4000;

  let rail = $state<HTMLDivElement | null>(null);
  let tail = $state(0);

  const earned = $derived(row.badges.filter((badge) => held(row, badge, progress)).length);
  const shown = $derived(row.badges.find((badge) => badge.id === open) ?? null);

  function toggle(badge: Badge, node: HTMLElement) {
    if (open === badge.id) {
      open = null;
      return;
    }

    const bounds = rail?.getBoundingClientRect();
    const button = node.getBoundingClientRect();
    if (bounds) tail = button.left + button.width / 2 - bounds.left;

    open = badge.id;
  }

  $effect(() => {
    if (shown === null) return;

    const timer = setTimeout(() => (open = null), LINGER);
    return () => clearTimeout(timer);
  });
</script>

<section>
  <h2>{row.label} : {earned}/{row.badges.length}</h2>

  <div class="rail" bind:this={rail}>
    {#each row.badges as badge (badge.id)}
      {@const on = held(row, badge, progress)}
      <button
        type="button"
        aria-label="{badge.name} — {on ? 'earned' : 'locked'}"
        aria-expanded={open === badge.id}
        aria-describedby={open === badge.id ? `tip-${row.id}` : undefined}
        onpointerdown={(event) => event.stopPropagation()}
        onclick={(event) => toggle(badge, event.currentTarget)}
      >
        <span class="art" class:on>
          <img class="lock" src={badge.locked} alt="" width="47" height="50" />
          <img class="won" src={badge.art} alt="" width="47" height="50" />
        </span>
      </button>
    {/each}

    {#if shown !== null}
      <div class="tip" id="tip-{row.id}" style:--tail="{tail}px" transition:fade={{ duration: 180 }}>
        <strong>{shown.name}</strong>
        <span>{shown.detail}</span>
      </div>
    {/if}
  </div>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    gap: calc(12 * var(--u));
  }

  h2 {
    margin: 0;
    color: #383838;
    font-size: calc(23 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.15 * var(--u));
    line-height: 1;
  }

  .rail {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    align-content: center;
    justify-content: space-between;
    gap: calc(12 * var(--u));
    min-height: calc(72 * var(--u));
    padding: calc(11 * var(--u)) calc(16 * var(--u));
    border-radius: calc(20 * var(--u));
    background: #383838;
    box-shadow: 0 calc(7 * var(--u)) 0 0 rgb(0 0 0 / 25%);
  }

  button {
    display: grid;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    place-items: center;
  }

  .art {
    position: relative;
    display: block;
    width: calc(47 * var(--u));
    height: calc(50 * var(--u));
  }

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 calc(3 * var(--u)) calc(2 * var(--u)) rgb(0 0 0 / 25%));
    transition: opacity 260ms ease;
  }

  .won {
    opacity: 0;
  }

  .art.on .won {
    opacity: 1;
  }

  .art.on .lock {
    opacity: 0;
  }

  .tip {
    position: absolute;
    right: 0;
    bottom: calc(100% + 14 * var(--u));
    left: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: calc(2 * var(--u));
    padding: calc(9 * var(--u)) calc(14 * var(--u)) calc(11 * var(--u));
    border: calc(4 * var(--u)) solid #2e2715;
    border-radius: calc(15 * var(--u));
    background: #fbfbfb;
    text-align: center;
  }

  strong {
    color: var(--secondary);
    font-size: calc(21 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.5 * var(--u));
  }

  span {
    color: var(--secondary);
    font-size: calc(15 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.15 * var(--u));
  }

  .tip::before,
  .tip::after {
    content: "";
    position: absolute;
    left: calc(var(--tail) - 18 * var(--u));
    border: calc(14 * var(--u)) solid transparent;
    border-bottom: 0;
  }

  .tip::before {
    top: 100%;
    border-top: calc(20 * var(--u)) solid #2e2715;
  }

  .tip::after {
    top: calc(100% - 5 * var(--u));
    border-top: calc(16 * var(--u)) solid #fbfbfb;
  }
</style>
