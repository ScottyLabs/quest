<script lang="ts">
  import ProgressBar from "./ProgressBar.svelte";
  import { mascotFor } from "$lib/leaderboard.svelte";

  let { community, percent }: { community: string | null; percent: number } = $props();

  const mascot = $derived(mascotFor(community));
  const filled = $derived(mascot === null ? 0 : percent);
  const mark = $derived(`/img/leaderboard/cup-${mascot?.slug ?? "default"}.svg`);
</script>

<div
  class="cup"
  style:--fill={mascot?.fill ?? "var(--accent)"}
  style:--edge={mascot?.edge ?? "var(--sink)"}
>
  <div class="card"></div>

  {#if mascot !== null}
    <img class="art" src="/img/mascots/card/{mascot.slug}.svg" alt="" />
  {/if}

  <img class="mark" src={mark} alt="Carnegie Cup Points" />
  <img class="trophy" src="/img/leaderboard/trophy.svg" alt="" />

  <div class="bar">
    <ProgressBar percent={filled} />
  </div>

  <p class="pct">{filled.toFixed(2)} %</p>
</div>

<style>
  .cup {
    position: absolute;
    z-index: 3;
    top: var(--notch);
    right: 0;
    left: 0;
    width: var(--frame);
    max-width: 100%;
    height: 0;
    margin-inline: auto;
    pointer-events: none;
  }

  .card {
    position: absolute;
    z-index: 0;
    top: calc(261.34 * var(--u));
    left: calc(46.72 * var(--u));
    width: calc(355.28 * var(--u));
    height: calc(132.53 * var(--u));
    border-radius: calc(16.24 * var(--u));
    box-shadow:
      0 calc(8.13 * var(--u)) 0 var(--edge),
      0 calc(13.13 * var(--u)) 0 rgb(0 0 0 / 25%);
    background:
      linear-gradient(90deg, rgb(255 255 255 / 0%) 55%, rgb(255 255 255 / 14%) 100%),
      var(--fill);
  }

  .art {
    position: absolute;
    z-index: 1;
    top: calc(214 * var(--u));
    left: calc(300 * var(--u));
    width: calc(145 * var(--u));
    height: calc(121 * var(--u));
    object-fit: contain;
    object-position: left bottom;
  }

  .mark {
    position: absolute;
    z-index: 2;
    top: calc(237 * var(--u));
    left: calc(104 * var(--u));
    width: calc(188 * var(--u));
    height: calc(101 * var(--u));
    filter: drop-shadow(calc(-0.84 * var(--u)) calc(2.4 * var(--u)) 0 var(--edge))
      drop-shadow(0 calc(5 * var(--u)) 0 rgb(0 0 0 / 25%));
  }

  .trophy {
    position: absolute;
    z-index: 2;
    top: calc(227 * var(--u));
    left: calc(11 * var(--u));
    width: calc(85 * var(--u));
    height: calc(109 * var(--u));
    filter: drop-shadow(0 calc(4.04 * var(--u)) 0 var(--edge))
      drop-shadow(0 calc(5 * var(--u)) 0 rgb(0 0 0 / 25%));
  }

  .bar {
    position: absolute;
    z-index: 2;
    top: calc(349.15 * var(--u));
    left: calc(68.65 * var(--u));
  }

  .pct {
    position: absolute;
    z-index: 2;
    top: calc(342 * var(--u));
    left: calc(268 * var(--u));
    width: calc(124 * var(--u));
    margin: 0;
    color: var(--highlight);
    font-size: calc(28 * var(--u));
    font-style: italic;
    font-stretch: 75%;
    letter-spacing: calc(0.56 * var(--u));
    text-align: right;
    text-shadow: 0 calc(5 * var(--u)) 0 rgb(0 0 0 / 25%);
  }
</style>
