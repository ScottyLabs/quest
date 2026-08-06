<script lang="ts">
  import { goto } from "$app/navigation";
  import BottomNav from "$lib/components/BottomNav.svelte";
  import { session } from "$lib/auth";
  import { theme, vars } from "$lib/theme";
  import { active } from "$lib/theme.svelte";

  let { children } = $props();

  const style = $derived(vars(theme(active.id)));

  $effect(() => {
    if (session.phase === "signedOut") void goto("/", { replaceState: true });
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
    overflow: hidden;
    background: var(--canvas);
  }
</style>
