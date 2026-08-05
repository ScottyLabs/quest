<script lang="ts">
  import "../app.css";
  import { session } from "$lib/auth";
  import DeviceBlocked from "$lib/components/DeviceBlocked.svelte";
  import Toast from "$lib/components/Toast.svelte";

  let { children } = $props();

  // Must run before anything reads `session.user`.
  session.restore();
</script>

{#if session.deviceOwned}
  <DeviceBlocked onSignOut={() => session.clear()} />
{:else}
  {@render children()}
{/if}

<Toast />
