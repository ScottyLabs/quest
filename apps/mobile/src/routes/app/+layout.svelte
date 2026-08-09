<script lang="ts">
  import { goto } from "$app/navigation";
  import BottomNav from "$lib/components/shell/BottomNav.svelte";
  import DailyBriefing from "$lib/components/daily/DailyBriefing.svelte";
  import TapResultSheet from "$lib/components/tap/TapResultSheet.svelte";
  import WarningDialog from "$lib/components/shell/WarningDialog.svelte";
  import { session } from "$lib/auth";
  import { caution, hush } from "$lib/caution.svelte";
  import { celebration, closeCelebration } from "$lib/celebrate.svelte";
  import { briefing, greet } from "$lib/daily.svelte";
  import { permitted } from "$lib/geo";
  import { watchTaps } from "$lib/deeplink";
  import { arm, NfcError } from "$lib/nfc";
  import { warn } from "$lib/notice.svelte";
  import { TapError } from "$lib/quests.svelte";
  import { handleTap } from "$lib/tap";
  import { theme, vars } from "$lib/theme";
  import { active } from "$lib/theme.svelte";

  let { children } = $props();

  const style = $derived(vars(theme(active.id)));

  async function retryLocation(): Promise<void> {
    if (await permitted()) hush();
  }

  $effect(() => {
    if (session.phase === "signedOut") void goto("/", { replaceState: true });
  });

  $effect(() => {
    if (session.phase === "signedIn") greet();
  });

  $effect(() => {
    if (session.phase !== "signedIn") return;

    const report = (error: unknown) => {
      if (error instanceof NfcError || error instanceof TapError) warn(error.message);
      else warn("Couldn't register that tap.");
    };

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

  {#if celebration.current}
    <TapResultSheet cleared={celebration.current} onclose={closeCelebration} />
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
    height: 100dvh;
    padding-right: var(--safe-right);
    padding-left: var(--safe-left);
    overflow: hidden;
    background: var(--canvas);
  }
</style>
