<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    detail,
    actions,
    children,
    flush = false,
  }: {
    title?: string;
    detail?: string;
    actions?: Snippet;
    children: Snippet;
    flush?: boolean;
  } = $props();
</script>

<section>
  {#if title !== undefined || actions !== undefined}
    <header>
      <div class="copy">
        {#if title !== undefined}<h2>{title}</h2>{/if}
        {#if detail !== undefined}<p>{detail}</p>{/if}
      </div>

      {#if actions !== undefined}
        <div class="acts">{@render actions()}</div>
      {/if}
    </header>
  {/if}

  <div class="body" class:flush>{@render children()}</div>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--highlight);
    box-shadow: var(--lift);
  }

  header {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--line);
  }

  .copy {
    min-width: 0;
  }

  .acts {
    display: flex;
    flex: none;
    gap: 8px;
    align-items: center;
  }

  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.2px;
  }

  p {
    margin: 2px 0 0;
    color: var(--tertiary);
    font-size: 13px;
  }

  .body {
    min-width: 0;
    padding: 20px;
  }

  .body.flush {
    padding: 0;
  }
</style>
