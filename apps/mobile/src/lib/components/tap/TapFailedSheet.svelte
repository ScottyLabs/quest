<script lang="ts">
  import WaveEdge from "../ui/WaveEdge.svelte";
  import type { TapFail } from "$lib/tapfail.svelte";

  let {
    fail,
    onretry,
    onclose,
  }: { fail: TapFail; onretry: () => void; onclose: () => void } = $props();

  const replayable = $derived(fail.retry === true && fail.url !== null);
</script>

<div class="scrim" role="presentation" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="sheet"
    role="alertdialog"
    aria-modal="true"
    aria-label={fail.title}
    tabindex="-1"
    onclick={(event) => event.stopPropagation()}
  >
    <div class="crest">
      <span class="wave"><WaveEdge shape="band" /></span>
      <span class="bang" aria-hidden="true">!</span>
    </div>

    <p class="eyebrow">{fail.eyebrow}</p>
    <h2>{fail.title}</h2>
    <p class="detail">{fail.body}</p>

    {#if fail.hint}
      <p class="hint">{fail.hint}</p>
    {/if}

    <p class="code">
      Error code: <code>{fail.code}</code>
    </p>

    <div class="acts">
      {#if replayable}
        <button class="fill" type="button" onclick={onretry}>Try again</button>
      {/if}
      <button class="quit" type="button" onclick={onclose}>
        {replayable ? "Not now" : "Got it"}
      </button>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 35;
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
    color: var(--muted);
  }

  .wave {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: block;
    height: calc(361 * var(--u));
  }

  .bang {
    position: absolute;
    bottom: calc(6 * var(--u));
    left: 50%;
    display: grid;
    width: calc(56 * var(--u));
    height: calc(56 * var(--u));
    border: calc(3 * var(--u)) solid var(--highlight);
    border-radius: 50%;
    background: var(--accent);
    color: var(--highlight);
    font-size: calc(30 * var(--u));
    font-weight: 700;
    line-height: 1;
    place-items: center;
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
    font-size: calc(24 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.48 * var(--u));
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

  .hint {
    margin: calc(14 * var(--u)) 0 0;
    padding: calc(12 * var(--u)) calc(14 * var(--u));
    border-radius: calc(14 * var(--u));
    background: var(--tertiary-normal);
    color: var(--ink-shade);
    font-size: calc(13 * var(--u));
    font-weight: 600;
    line-height: 1.45;
    text-align: center;
  }

  .code {
    margin: calc(14 * var(--u)) 0 0;
    color: var(--muted);
    font-size: calc(11 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.8 * var(--u));
    text-align: center;
    text-transform: uppercase;
  }

  /* body sets user-select:none; staff ask users to read this back */
  .code code {
    color: var(--tertiary);
    font-family: ui-monospace, monospace;
    font-size: calc(12 * var(--u));
    letter-spacing: 0;
    text-transform: none;
    -webkit-user-select: text;
    user-select: text;
  }

  .acts {
    display: flex;
    flex-direction: column;
    gap: calc(8 * var(--u));
    margin-top: calc(20 * var(--u));
  }

  .fill,
  .quit {
    height: calc(48 * var(--u));
    border: 0;
    border-radius: calc(24 * var(--u));
    font: inherit;
    font-size: calc(15 * var(--u));
    font-weight: 700;
    cursor: pointer;
  }

  .fill {
    background: var(--accent);
    color: var(--highlight);
  }

  .fill:active {
    filter: brightness(0.94);
  }

  .quit {
    background: none;
    color: var(--tertiary);
  }
</style>
