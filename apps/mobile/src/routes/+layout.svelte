<script lang="ts">
  import "../app.css";
  import { Capacitor } from "@capacitor/core";
  import { session } from "$lib/auth";
  import DeviceBlocked from "$lib/components/shell/DeviceBlocked.svelte";
  import Toast from "$lib/components/shell/Toast.svelte";

  document.documentElement.dataset.platform = Capacitor.getPlatform();

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
