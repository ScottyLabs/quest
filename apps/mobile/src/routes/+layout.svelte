<script lang="ts">
  import "../app.css";
  import { Capacitor } from "@capacitor/core";
  import { session } from "$lib/auth";
  import DeviceBlocked from "$lib/components/shell/DeviceBlocked.svelte";
  import Toast from "$lib/components/shell/Toast.svelte";
  import { watchTaps } from "$lib/deeplink";
  import { NfcError } from "$lib/nfc";
  import { warn } from "$lib/notice.svelte";
  import { handleTap } from "$lib/tap";
  import { ready } from "$lib/updates";

  document.documentElement.dataset.platform = Capacitor.getPlatform();

  if (Capacitor.isNativePlatform()) void ready();

  let { children } = $props();

  session.restore();

  function report(error: unknown): void {
    if (error instanceof NfcError) warn(error.message);
    else warn("Couldn't register that tap.");
  }

  $effect(() => {
    let unwatch: (() => void) | null = null;
    let dropped = false;

    watchTaps((url) => void handleTap(url).catch(report)).then(
      (off) => (dropped ? off() : (unwatch = off)),
      report,
    );

    return () => {
      dropped = true;
      unwatch?.();
    };
  });
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
