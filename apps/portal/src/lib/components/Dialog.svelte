<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    onclose,
    children,
    actions,
    wide = false,
  }: {
    title: string;
    onclose: () => void;
    children: Snippet;
    actions?: Snippet;
    wide?: boolean;
  } = $props();

  function keyed(event: KeyboardEvent): void {
    if (event.key === "Escape") onclose();
  }
</script>

<svelte:window onkeydown={keyed} />

<div class="scrim" role="presentation" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    class="card"
    class:wide
    role="dialog"
    aria-modal="true"
    aria-label={title}
    tabindex="-1"
    onclick={(event) => event.stopPropagation()}
  >
    <header>
      <h2>{title}</h2>
      <button type="button" onclick={onclose} aria-label="Close">&times;</button>
    </header>

    <div class="body">{@render children()}</div>

    {#if actions !== undefined}
      <footer>{@render actions()}</footer>
    {/if}
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    padding: 24px;
    background: rgb(0 0 0 / 0.45);
    place-items: center;
  }

  .card {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 34rem;
    max-height: calc(100dvh - 48px);
    border-radius: var(--radius-lg);
    background: var(--highlight);
    box-shadow: var(--lift-high);
  }

  .card.wide {
    max-width: 60rem;
  }

  header {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--line);
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
  }

  header button {
    padding: 0 4px;
    border: 0;
    background: none;
    color: var(--tertiary);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
  }

  .body {
    overflow: auto;
    padding: 20px;
  }

  footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 14px 20px;
    border-top: 1px solid var(--line);
  }
</style>
