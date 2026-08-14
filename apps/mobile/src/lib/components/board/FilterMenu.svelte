<script lang="ts">
  import { filters, LABELS, type Bucket } from "$lib/filters.svelte";

  let { onclose }: { onclose: () => void } = $props();

  const ORDER: Bucket[] = ["challenges", "completed", "locked"];
  const GLYPH: Record<Bucket, { w: number; h: number }> = {
    challenges: { w: 31, h: 30 },
    completed: { w: 30, h: 25 },
    locked: { w: 24, h: 26 },
  };

  const narrowed = $derived(ORDER.some((key) => filters[key]));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="catch" onclick={onclose}></div>

<div class="anchor">
  <div class="menu" class:narrowed role="group" aria-label="Filter challenges">
    {#each ORDER as key (key)}
      <button
        class="row"
        class:on={filters[key]}
        type="button"
        aria-pressed={filters[key]}
        onclick={() => (filters[key] = !filters[key])}
      >
        <span class="label">{LABELS[key]}</span>

        <span class="box">
          <img
            src="/img/quest/filter-{key}-{filters[key] ? 'on' : 'off'}.svg"
            alt=""
            style:--w="calc({GLYPH[key].w} * var(--u))"
            style:--h="calc({GLYPH[key].h} * var(--u))"
          />
        </span>
      </button>
    {/each}
  </div>
</div>

<style>
  .catch {
    position: fixed;
    z-index: 20;
    inset: 0;
  }

  .anchor {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 21;
    width: var(--frame);
    max-width: 100%;
    height: 0;
    margin-inline: auto;
  }

  .menu {
    --line: #f7f6f6;
    --rim: #b3b3b3;

    position: absolute;
    top: calc(19 * var(--u));
    right: calc(20 * var(--u));
    overflow: hidden;
    width: calc(268 * var(--u));
    max-width: 100%;
    border: calc(2 * var(--u)) solid var(--rim);
    border-radius: calc(10 * var(--u));
    background: var(--highlight);
    box-shadow: 0 calc(6 * var(--u)) calc(18 * var(--u)) rgb(0 0 0 / 0.18);
  }

  .narrowed {
    --line: #54b751;
    --rim: #54b751;
  }

  .row {
    --ink: #626262;
    --box: #f0eeee;
    --edge: #afafaf;

    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: calc(12 * var(--u));
    width: 100%;
    min-height: calc(69 * var(--u));
    padding: 0 calc(20 * var(--u)) 0 calc(25 * var(--u));
    border: 0;
    background: none;
    cursor: pointer;
    touch-action: manipulation;
  }

  .row.on {
    --ink: #54b751;
    --box: #c1f3bf;
    --edge: #54b751;

    background: #c1f3bf;
  }

  .row + .row {
    border-top: calc(1 * var(--u)) solid var(--line);
  }

  .row:active {
    filter: brightness(0.97);
  }

  .label {
    color: var(--ink);
    font-size: calc(24 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.48 * var(--u));
  }

  .box {
    display: grid;
    flex: none;
    width: calc(45 * var(--u));
    height: calc(42 * var(--u));
    border: calc(1 * var(--u)) solid var(--edge);
    border-radius: calc(4.5 * var(--u));
    background: var(--box);
    place-items: center;
  }

  .box img {
    display: block;
    width: var(--w);
    height: var(--h);
  }
</style>
