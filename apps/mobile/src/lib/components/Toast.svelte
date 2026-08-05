<script lang="ts">
  import { notice, dismiss } from "$lib/notice.svelte";
</script>

{#if notice.current}
  <div class="wrap" role="alert" aria-live="assertive">
    <div class="card">
      <p>{notice.current}</p>
      <button onclick={dismiss} aria-label="Dismiss">Dismiss</button>
    </div>
  </div>
{/if}

<style>
  /* Fixed, so a message never participates in any screen's layout. The mascot
     rail and Confirm sit on measured marks and must not move for an error. */
  .wrap {
    position: fixed;
    inset: auto 0 calc(24px + env(safe-area-inset-bottom));
    z-index: 50;
    display: flex;
    justify-content: center;
    padding: 0 16px;
    pointer-events: none;
  }

  .card {
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: 22rem;
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--primary-dark);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.24);
    pointer-events: auto;
  }

  p {
    margin: 0;
    flex: 1;
    font-size: 13px;
    line-height: 1.4;
    color: var(--highlight);
    text-align: left;
  }

  button {
    flex: none;
    border: none;
    background: none;
    padding: 4px;
    color: var(--highlight);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
