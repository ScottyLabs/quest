<script lang="ts">
  import { authMessage, session } from "$lib/auth";
  import { watchCallbacks } from "$lib/auth/callback";
  import DeviceBlocked from "$lib/components/shell/DeviceBlocked.svelte";
  import Toast from "$lib/components/shell/Toast.svelte";
  import WarningDialog from "$lib/components/shell/WarningDialog.svelte";
  import { watchTaps } from "$lib/deeplink";
  import { NfcError } from "$lib/nfc";
  import { warn } from "$lib/notice.svelte";
  import { hideSplash } from "$lib/splash";
  import { handleTap } from "$lib/tap";
  import { ready } from "$lib/updates";
  import { me } from "$lib/user.svelte";
  import { Capacitor } from "@capacitor/core";
  import "../app.css";

  const SETTLE_GRACE = 2000;

  document.documentElement.dataset.platform = Capacitor.getPlatform();

  if (Capacitor.isNativePlatform()) void ready();

  let { children } = $props();

  session.restore();

  function report(error: unknown): void {
    if (error instanceof NfcError) warn(error.message);
    else warn("Couldn't register that tap.");
  }

  let waited = $state(false);

  const decided = $derived(
    session.phase !== "restoring" && (waited || !session.signedIn || me.settled),
  );

  $effect(() => {
    if (session.signedIn) void me.load();
  });

  $effect(() => {
    if (session.phase === "restoring") return;

    const timer = setTimeout(() => (waited = true), SETTLE_GRACE);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (decided) hideSplash();
  });

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

  $effect(() => {
    let unwatch: (() => void) | null = null;
    let dropped = false;

    watchCallbacks().then(
      (off) => (dropped ? off() : (unwatch = off)),
      (error: unknown) => warn(authMessage(error)),
    );

    return () => {
      dropped = true;
      unwatch?.();
    };
  });
  // TEMP ANNOUNCEMENT DUE TO RAIN
  let announcementOpen = $state(true);
</script>

{#if session.phase === "restoring"}
  <div class="booting"></div>
{:else if session.deviceOwned}
  <DeviceBlocked onSignOut={() => session.clear()} />
{:else}
  {@render children()}
{/if}

{#if session.phase !== "restoring" && announcementOpen}
    <WarningDialog
      image="/img/weather_delay.svg"
      title="O-Quest Weather Update"
      body="Due to inclement weather, O-Quest commencement is delayed to 12:00 PM Monday, August 17."
      dismiss="Got it"
      ondismiss={() => (announcementOpen = false)}
/>
{/if}

<Toast />

<div class="sideways">
  <p>Orientation Quest works upright.<br />Turn your phone back to portrait.</p>
</div>

<style>
  .booting {
    height: 100dvh;
    background: var(--highlight);
  }

  .sideways {
    display: none;
  }

  @media (orientation: landscape) and (max-height: 520px) {
    .sideways {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 2rem;
      background: var(--highlight);
      color: var(--ink-shade);
      font-size: 1.0625rem;
      font-weight: 600;
      line-height: 1.5;
      text-align: center;
    }
  }
</style>
