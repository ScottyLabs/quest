<script lang="ts">
  import Commemorate from "./Commemorate.svelte";
  import WaveEdge from "../ui/WaveEdge.svelte";
  import type { Cleared } from "$lib/celebrate.svelte";

  let { cleared, onclose }: { cleared: Cleared; onclose: () => void } = $props();
</script>

<div class="scrim" role="presentation" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    class="sheet"
    role="dialog"
    aria-modal="true"
    aria-label={cleared.repeat ? "Challenge already cleared" : "Challenge cleared"}
    tabindex="-1"
    onclick={(event) => event.stopPropagation()}
  >
    <div class="crest">
      <span class="wave"><WaveEdge shape="band" /></span>
      <img class="badge" src="/img/quest/badge-done.svg" alt="" />
    </div>

    <p class="eyebrow">{cleared.repeat ? "Already cleared" : "Challenge cleared"}</p>
    <h2>{cleared.name}</h2>
    <p class="detail">{cleared.description}</p>

    {#if !cleared.repeat}
      <div class="earned">
        <img src="/img/quest/stat-coin.svg" alt="" />
        <span>+{cleared.reward}</span>
        {#if cleared.place !== null}
          <span class="place">#{cleared.place} to clear it</span>
        {/if}
      </div>
    {/if}

    <Commemorate challengeId={cleared.id} title={cleared.name} reward={cleared.reward} />

    <button class="done" type="button" onclick={onclose}>Done</button>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    align-items: flex-end;
    background: rgb(0 0 0 / 0.55);
  }

  .sheet {
    width: 100%;
    max-height: 100%;
    padding: 0 calc(24 * var(--u) + var(--safe-right)) max(calc(24 * var(--u)), var(--safe-bottom))
      calc(24 * var(--u) + var(--safe-left));
    overflow-y: auto;
    border-radius: calc(32 * var(--u)) calc(32 * var(--u)) 0 0;
    background: var(--highlight);
  }

  .crest {
    position: relative;
    height: calc(96 * var(--u));
    margin: 0 calc(-24 * var(--u) - var(--safe-right)) calc(14 * var(--u))
      calc(-24 * var(--u) - var(--safe-left));
    overflow: hidden;
    border-radius: calc(32 * var(--u)) calc(32 * var(--u)) 0 0;
    color: var(--crown);
  }

  .wave {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: block;
    height: calc(361 * var(--u));
  }

  .badge {
    position: absolute;
    bottom: calc(6 * var(--u));
    left: 50%;
    width: calc(62 * var(--u));
    height: calc(56 * var(--u));
    translate: -50% 0;
  }

  .eyebrow {
    margin: 0;
    color: var(--accent);
    font-size: calc(13 * var(--u));
    font-weight: 700;
    letter-spacing: calc(1.2 * var(--u));
    text-align: center;
    text-transform: uppercase;
  }

  h2 {
    margin: calc(6 * var(--u)) 0 0;
    color: var(--secondary);
    font-size: calc(28 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.56 * var(--u));
    text-align: center;
  }

  .detail {
    margin: calc(10 * var(--u)) 0 0;
    color: var(--tertiary);
    font-size: calc(14 * var(--u));
    font-weight: 600;
    line-height: 1.5;
    text-align: center;
  }

  .earned {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: calc(6 * var(--u));
    margin: calc(16 * var(--u)) 0 calc(18 * var(--u));
    color: var(--ink-shade);
    font-size: calc(20 * var(--u));
    font-weight: 600;
  }

  .earned img {
    display: block;
    width: calc(28 * var(--u));
    height: calc(30 * var(--u));
  }

  .place {
    color: var(--tertiary);
    font-size: calc(13 * var(--u));
    font-weight: 600;
  }

  .done {
    width: 100%;
    margin-top: calc(12 * var(--u));
    padding: calc(10 * var(--u));
    border: 0;
    background: none;
    color: var(--tertiary);
    font: inherit;
    font-size: calc(15 * var(--u));
    font-weight: 700;
    cursor: pointer;
  }
</style>
