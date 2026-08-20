<script lang="ts">
  import { mascotFor, type Metric, type Standing } from "$lib/leaderboard.svelte";
  import { warn } from "$lib/notice.svelte";
  import { me } from "$lib/user.svelte";

  let { row, metric }: { row: Standing; metric: Metric } = $props();

  const house = $derived(mascotFor(row.community)?.home ?? "");
  const nameColor = $derived(mascotFor(row.community)?.shade ?? "var(--secondary)");
  const icon = $derived(metric === "coins" ? "/img/trade/coin.svg" : "/img/leaderboard/gem.svg");
  const veiled = $derived(row.you && me.anonymous);
  const shown = $derived(veiled ? `Anonymous #${row.rank}` : row.name);

  let busy = $state(false);

  async function toggleHidden(): Promise<void> {
    busy = true;
    const ok = await me.setAnonymous(!me.anonymous);
    busy = false;
    if (!ok) warn("Couldn't change that just now.");
  }
</script>

<div class="row" class:you={row.you} style:--name-color={nameColor}>
  <div class="inner">
    <span class="rank">{row.rank}.</span>

    <span class="who">
      <span class="name" class:veiled>{shown}</span>
      <span class="house">{house}</span>
    </span>

    {#if row.you}
      <button
        class="veil"
        class:on={veiled}
        type="button"
        role="switch"
        aria-checked={veiled}
        aria-label="Anonymous on the leaderboard"
        disabled={busy}
        onclick={() => void toggleHidden()}
      >
        <span class="pip"></span>
        <span class="word">{veiled ? "Hidden" : "Shown"}</span>
      </button>
    {/if}

    <span class="score">
      <img class="gem" src={icon} alt="" />
      <span class="tally">{row.score}</span>
    </span>
  </div>
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    width: 100%;
    height: calc(80 * var(--u));
    padding: 0 calc(27.5 * var(--u));
  }

  .inner {
    display: flex;
    flex: 1;
    align-items: center;
    gap: calc(20 * var(--u));
    max-width: var(--column);
    min-width: 0;
    margin-inline: auto;
  }

  .you {
    height: calc(92 * var(--u));
    padding-top: calc(13 * var(--u));
    padding-bottom: calc(23 * var(--u));
    border-bottom: calc(6 * var(--u)) solid var(--band);
    background: var(--accent);
  }

  .rank {
    flex: none;
    width: calc(40 * var(--u));
    color: var(--ink-shade);
    font-size: calc(28 * var(--u));
    font-style: italic;
    font-stretch: 75%;
    letter-spacing: calc(0.56 * var(--u));
  }

  .who {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: calc(6 * var(--u));
    min-width: 0;
  }

  .name {
    display: flex;
    overflow: hidden;
    align-items: flex-end;
    height: calc(33 * var(--u));
    padding-bottom: calc(2 * var(--u));
    color: var(--name-color);
    font-size: calc(16 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.32 * var(--u));
    line-height: 1;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .name.veiled {
    font-style: italic;
    letter-spacing: calc(0.2 * var(--u));
  }

  .veil {
    display: flex;
    flex: none;
    align-items: center;
    gap: calc(7 * var(--u));
    height: calc(30 * var(--u));
    margin-right: calc(14 * var(--u));
    padding: 0 calc(11 * var(--u)) 0 calc(9 * var(--u));
    border: 0;
    border-radius: calc(15 * var(--u));
    background: var(--highlight);
    box-shadow: inset 0 0 0 calc(1.5 * var(--u)) rgb(0 0 0 / 0.06);
    cursor: pointer;
    transition:
      background 160ms ease,
      box-shadow 160ms ease;
  }

  .veil.on {
    flex-direction: row-reverse;
    padding: 0 calc(9 * var(--u)) 0 calc(11 * var(--u));
    background: var(--secondary);
    box-shadow: inset 0 0 0 calc(1.5 * var(--u)) rgb(255 255 255 / 0.18);
  }

  .veil:active {
    translate: 0 calc(1 * var(--u));
  }

  .pip {
    display: block;
    flex: none;
    width: calc(12 * var(--u));
    height: calc(12 * var(--u));
    border-radius: 50%;
    background: var(--accent);
    transition: background 160ms ease;
  }

  .veil.on .pip {
    background: var(--highlight);
  }

  .word {
    color: var(--secondary);
    font-size: calc(11 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.4 * var(--u));
    line-height: 1;
    text-transform: uppercase;
    transition: color 160ms ease;
  }

  .veil.on .word {
    color: var(--highlight);
  }

  .house {
    overflow: hidden;
    height: calc(17 * var(--u));
    color: #004281;
    font-size: calc(12 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.24 * var(--u));
    line-height: 1;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .score {
    display: flex;
    flex: none;
    align-items: flex-end;
    margin-right: calc(15 * var(--u));
  }

  .gem {
    display: block;
    flex: none;
    width: calc(33 * var(--u));
    height: calc(34.96 * var(--u));
    margin-bottom: calc(-1.96 * var(--u));
  }

  .tally {
    min-width: calc(21 * var(--u));
    padding-bottom: calc(4 * var(--u));
    color: var(--ink-shade);
    font-size: calc(20 * var(--u));
    font-style: italic;
    font-weight: 600;
    font-stretch: 75%;
    letter-spacing: calc(0.4 * var(--u));
    line-height: 1.05925;
    text-align: right;
  }

  .you .rank,
  .you .name,
  .you .house,
  .you .tally {
    color: var(--highlight);
  }
</style>
