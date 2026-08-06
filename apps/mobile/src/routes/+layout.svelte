<script lang="ts">
  import "../app.css";
  import { session } from "$lib/auth";
  import DeviceBlocked from "$lib/components/DeviceBlocked.svelte";
  import Toast from "$lib/components/Toast.svelte";

  let { children } = $props();

  session.restore();
</script>

{#if session.phase === "restoring"}
  <div class="booting"></div>
{:else if session.deviceOwned}
  <DeviceBlocked onSignOut={() => session.clear()} />
{:else}
  {@render children()}
{/if}

<Toast />

<style>
  .booting {
    height: 100dvh;
    background: var(--highlight);
  }
</style>
