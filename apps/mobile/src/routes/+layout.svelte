<script lang="ts">
  let { children } = $props();
</script>

<main>
  {@render children()}
</main>

<style>
  :global(:root) {
    --bg: #fbfaf9;
    --card: #ffffff;
    --text: #1a1a1a;
    --muted: #6b6b6b;
    --line: #e3e0dd;
    --accent: #c41230; /* CMU red */

    color-scheme: light dark;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --bg: #121212;
      --card: #1c1c1c;
      --text: #f2f2f2;
      --muted: #9a9a9a;
      --line: #2e2e2e;
      --accent: #ff4d69;
    }
  }

  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    -webkit-text-size-adjust: 100%;
  }

  main {
    /* Keep content clear of notches and home indicators on device */
    padding: max(1.5rem, env(safe-area-inset-top)) 1rem
      max(1.5rem, env(safe-area-inset-bottom));
    max-width: 32rem;
    margin: 0 auto;
  }
</style>
