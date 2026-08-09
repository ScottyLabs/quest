<script lang="ts">
  let { title, oncancel }: { title: string; oncancel: () => void } = $props();
</script>

<div class="scrim">
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Scan the challenge tag">
    <span class="pulse"></span>
    <h2>Hold your phone to the tag</h2>
    <p>{title}</p>
    <button onclick={oncancel}>Cancel</button>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: flex;
    align-items: flex-end;
    background: rgb(0 0 0 / 0.45);
  }

  .sheet {
    display: grid;
    justify-items: center;
    gap: 12px;
    width: 100%;
    padding: 28px calc(24px + var(--safe-right)) max(28px, var(--safe-bottom))
      calc(24px + var(--safe-left));
    border-radius: 24px 24px 0 0;
    background: var(--highlight);
    text-align: center;
  }

  .pulse {
    width: 64px;
    height: 64px;
    border: 4px solid var(--accent);
    border-radius: 50%;
    animation: breathe 1.4s ease-in-out infinite;
  }

  h2 {
    margin: 0;
    color: var(--secondary);
    font-size: 18px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: var(--tertiary);
    font-size: 13px;
    font-weight: 600;
  }

  button {
    margin-top: 4px;
    padding: 12px 28px;
    border: 0;
    border-radius: 999px;
    background: var(--accent);
    color: var(--highlight);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  @keyframes breathe {
    0%,
    100% {
      opacity: 0.35;
      transform: scale(0.9);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pulse {
      animation: none;
      opacity: 1;
    }
  }
</style>
