<script lang="ts">
  import { goto } from "$app/navigation";
  import BottomNav from "$lib/components/BottomNav.svelte";
  import { session } from "$lib/auth";
  import { arm, NfcError } from "$lib/nfc";
  import { warn } from "$lib/notice.svelte";
  import { TapError } from "$lib/quests.svelte";
  import { handleTap } from "$lib/tap";
  import { theme, vars } from "$lib/theme";
  import { active } from "$lib/theme.svelte";

  let { children } = $props();

  const style = $derived(vars(theme(active.id)));

  $effect(() => {
    if (session.phase === "signedOut") void goto("/", { replaceState: true });
  });

  $effect(() => {
    let disarm: (() => void) | null = null;

    void arm((url) => {
      void handleTap(url).catch((error: unknown) => {
        if (error instanceof NfcError || error instanceof TapError) warn(error.message);
        else warn("Couldn't register that tap.");
      });
    }).then((off) => (disarm = off));

    return () => disarm?.();
  });
</script>

<div class="shell" {style}>
  {@render children()}
  <BottomNav />
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
