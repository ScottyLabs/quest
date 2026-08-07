<script lang="ts">
  import { goto } from "$app/navigation";
  import { authMessage, session } from "$lib/auth";
  import { profile } from "$lib/user";
  import { onMount } from "svelte";

  let failure = $state<string | null>(null);

  onMount(async () => {
    try {
      await session.adoptFragment(location.hash);
    } catch (error) {
      console.error("sign-in failed", error);
      failure = authMessage(error);
      return;
    }

    await goto((await profile())?.dorm ? "/app" : "/mascots", { replaceState: true });
  });
</script>

<svelte:head><title>Signing in - Orientation Quest</title></svelte:head>

<main>
  {#if failure === null}
    <p>Signing you in...</p>
  {:else}
    <p>{failure}</p>
    <a href="/">Back to Orientation Quest</a>
  {/if}
</main>

<style>
  main {
    display: grid;
    gap: 1rem;
    justify-items: center;
    padding: 3rem 1.5rem;
    text-align: center;
  }
</style>
