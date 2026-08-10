<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import BottomNav from "$lib/components/shell/BottomNav.svelte";
  import DailyBriefing from "$lib/components/daily/DailyBriefing.svelte";
  import NfcSheet from "$lib/components/tap/NfcSheet.svelte";
  import TapFailedSheet from "$lib/components/tap/TapFailedSheet.svelte";
  import TapResultSheet from "$lib/components/tap/TapResultSheet.svelte";
  import WarningDialog from "$lib/components/shell/WarningDialog.svelte";
  import { session } from "$lib/auth";
  import { caution, hush } from "$lib/caution.svelte";
  import { celebration, closeCelebration } from "$lib/celebrate.svelte";
  import { briefing, greet } from "$lib/daily.svelte";
  import { currentTab } from "$lib/nav";
  import { permitted } from "$lib/geo";
  import { watchTaps } from "$lib/deeplink";
  import { arm, NfcError, showsSystemSheet } from "$lib/nfc";
  import { warn } from "$lib/notice.svelte";
  import { cancelScan, scanning } from "$lib/scanning.svelte";
  import { handleTap, tapScan } from "$lib/tap";
  import { closeTapFail, tapfail } from "$lib/tapfail.svelte";
  import { FALLBACK, theme, vars } from "$lib/theme";
  import { active } from "$lib/theme.svelte";

  let { children } = $props();

  const board = $derived(currentTab(page.url.pathname)?.href === "/app");
  const style = $derived(vars(theme(board ? active.id : FALLBACK)));

  function report(error: unknown): void {
    if (error instanceof NfcError) warn(error.message);
    else warn("Couldn't register that tap.");
  }

  async function retryLocation(): Promise<void> {
    if (await permitted()) hush();
  }

  async function retryTap(): Promise<void> {
    const url = tapfail.current?.url ?? null;
    closeTapFail();
    await tapScan("challenge", url).catch(report);
  }

  $effect(() => {
    if (session.phase === "signedOut") void goto("/", { replaceState: true });
  });

  $effect(() => {
    if (session.phase === "signedIn") greet();
  });

  $effect(() => {
    if (session.phase !== "signedIn") return;

    let disarm: (() => void) | null = null;
    let unwatch: (() => void) | null = null;

    void arm((url) => void handleTap(url).catch(report)).then((off) => (disarm = off));
    watchTaps((url) => void handleTap(url).catch(report)).then((off) => (unwatch = off), report);

    return () => {
      disarm?.();
      unwatch?.();
    };
  });
</script>

<div class="shell" {style}>
  {@render children()}
  <BottomNav />

  {#if scanning.label !== null && !showsSystemSheet}
    <NfcSheet title={scanning.label} oncancel={cancelScan} />
  {/if}

  {#if celebration.current}
    <TapResultSheet cleared={celebration.current} onclose={closeCelebration} />
  {/if}

  {#if tapfail.current}
    <TapFailedSheet fail={tapfail.current} onretry={retryTap} onclose={closeTapFail} />
  {/if}

  {#if caution.current}
    <WarningDialog
      title={caution.current.title}
      body={caution.current.body}
      onconfirm={retryLocation}
      ondismiss={hush}
    />
  {/if}

  {#if briefing.open}
    <DailyBriefing />
  {/if}
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: calc(439px + var(--safe-left) + var(--safe-right));
    height: 100dvh;
    margin-inline: auto;
    padding-right: var(--safe-right);
    padding-left: var(--safe-left);
    overflow: hidden;
    background: var(--canvas);
  }
</style>
