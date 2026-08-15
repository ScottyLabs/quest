<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/components/Button.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { me } from "$lib/identity.svelte";
  import { session } from "$lib/session.svelte";

  const REASONS: Record<string, string> = {
    no_andrew_id: "Keycloak did not send an Andrew ID for that account.",
    access_denied: "You cancelled the sign-in.",
    device_unverified: "That sign-in was missing its device ticket.",
    session_store_unavailable: "The session store is down. Try again in a moment.",
  };

  let failure = $state<string | null>(null);

  onMount(async () => {
    try {
      if (!session.adopt(location.hash)) {
        failure = "That sign-in did not carry a session.";
        return;
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown";
      failure = REASONS[code] ?? `Sign-in failed: ${code}`;
      return;
    }

    history.replaceState(null, "", location.pathname);
    me.forget();
    await goto(resolve("/"), { replaceState: true });
  });
</script>

<main>
  {#if failure === null}
    <Spinner label="Signing you in" />
  {:else}
    <div class="card">
      <h1>Sign-in failed</h1>
      <p>{failure}</p>
      <Button onclick={() => session.start()}>Try again</Button>
    </div>
  {/if}
</main>

<style>
  main {
    display: grid;
    min-height: 100dvh;
    padding: 24px;
    place-items: center;
  }

  .card {
    width: 100%;
    max-width: 25rem;
    padding: 32px;
    border-radius: var(--radius-lg);
    background: var(--highlight);
    box-shadow: var(--lift);
    text-align: center;
  }

  h1 {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 800;
  }

  p {
    margin: 0 0 22px;
    color: var(--tertiary);
    font-size: 13px;
    line-height: 1.6;
  }
</style>
