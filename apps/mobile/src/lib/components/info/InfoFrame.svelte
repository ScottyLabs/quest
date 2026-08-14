<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    subtitle,
    crest,
    onback,
    children,
  }: {
    title: string;
    subtitle: string;
    crest?: string;
    onback?: () => void;
    children: Snippet;
  } = $props();
</script>

<section>
  <header>
    <div class="bar">
      {#if crest}
        <img class="crest" src={crest} alt="" width="97" height="97" />
      {:else if onback}
        <button class="back" type="button" onclick={onback} aria-label="Back">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z" fill="currentColor" />
          </svg>
        </button>
      {/if}

      <div class="titles">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  </header>

  <div class="ledge">
    <div class="sheet">{@render children()}</div>
  </div>
</section>

<style>
  section {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    background: #9c0114;
  }

  header {
    flex: none;
    padding: calc(var(--safe-top) + 16 * var(--u)) calc(24 * var(--u)) calc(6 * var(--u))
      calc(22 * var(--u));
    background: linear-gradient(180deg, #c41230, #990012);
  }

  .bar {
    display: flex;
    align-items: flex-end;
    gap: calc(2 * var(--u));
    max-width: var(--column);
    margin-inline: auto;
  }

  .crest {
    flex: none;
    width: calc(97 * var(--u));
    height: calc(97 * var(--u));
  }

  .back {
    display: grid;
    flex: none;
    width: calc(40 * var(--u));
    height: calc(40 * var(--u));
    align-self: flex-start;
    margin-right: calc(4 * var(--u));
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgb(255 255 255 / 16%);
    color: var(--highlight);
    cursor: pointer;
    place-items: center;
  }

  .back:active {
    background: rgb(255 255 255 / 30%);
  }

  .titles {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: calc(2 * var(--u));
    min-width: 0;
    padding-bottom: calc(7 * var(--u));
    color: var(--highlight);
  }

  h1 {
    margin: 0;
    font-size: calc(32 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.64 * var(--u));
  }

  p {
    margin: 0;
    font-size: calc(16 * var(--u));
    letter-spacing: calc(0.32 * var(--u));
  }

  .ledge {
    display: flex;
    flex: 1;
    min-height: 0;
    margin-top: calc(27 * var(--u));
    padding-top: calc(28 * var(--u));
    border-radius: calc(49 * var(--u)) calc(49 * var(--u)) 0 0;
    background: #4c0101;
  }

  .sheet {
    flex: 1;
    min-height: 0;
    border-radius: calc(49 * var(--u)) calc(49 * var(--u)) 0 0;
    background: var(--highlight);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
</style>
