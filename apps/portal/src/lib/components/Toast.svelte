<script lang="ts">
  import { dismiss, notice } from "$lib/notice.svelte";
</script>

{#if notice.current !== null}
  <div class="wrap" role="alert" aria-live="assertive">
    <div class="card {notice.current.tone}">
      <p>{notice.current.text}</p>
      <button type="button" onclick={dismiss} aria-label="Dismiss">&times;</button>
    </div>
  </div>
{/if}

<style>
  .wrap {
    position: fixed;
    inset: auto 0 24px;
    z-index: 60;
    display: flex;
    justify-content: center;
    padding: 0 16px;
    pointer-events: none;
  }

  .card {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    max-width: 34rem;
    padding: 12px 14px;
    border-radius: var(--radius);
    background: var(--primary-dark);
    color: var(--highlight);
    box-shadow: var(--lift-high);
    pointer-events: auto;
  }

  .card.good {
    background: #1f6f2c;
  }

  .card.bad {
    background: var(--sink);
  }

  p {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  button {
    flex: none;
    padding: 0 2px;
    border: 0;
    background: none;
    color: inherit;
    font-size: 20px;
    line-height: 1;
    opacity: 0.7;
    cursor: pointer;
  }

  button:hover {
    opacity: 1;
  }
</style>
