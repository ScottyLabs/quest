<script lang="ts">
  import Button from "$lib/components/Button.svelte";

  let { onSignOut }: { onSignOut?: () => void } = $props();
</script>

<div class="screen">
  <main>
    <div class="mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" role="img">
        <rect x="6" y="14" width="20" height="14" rx="3" fill="currentColor" />
        <path
          d="M11 14v-4a5 5 0 0 1 10 0v4"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        />
      </svg>
    </div>

    <h1>This device has already been registered</h1>
    <p>
      This phone is signed in to a different Orientation Quest account. Each phone can only be used with one
      account.
    </p>
    <p>
      If you believe this is a mistake, please contact <a href="mailto:quest@scottylabs.org">quest@scottylabs.org</a> and we will work to resolve the situation.
    </p>
  </main>

  {#if onSignOut}
    <div class="actions">
      <Button onclick={onSignOut}>Back to sign in</Button>
    </div>
  {/if}
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    padding: calc(27px + env(safe-area-inset-top)) 16px calc(14px + env(safe-area-inset-bottom));
    background: var(--highlight);
    text-align: center;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 12px;
  }

  .mark {
    width: 64px;
    height: 64px;
    margin-bottom: 8px;
    color: var(--primary);
  }

  .mark svg {
    width: 100%;
    height: 100%;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 0.15px;
    color: var(--primary-dark);
  }

  p {
    margin: 0;
    max-width: 30ch;
    font-size: 15px;
    line-height: 1.5;
    color: var(--tertiary);
  }

  .actions {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }
</style>
