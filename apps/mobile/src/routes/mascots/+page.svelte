<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/Button.svelte";
  import TopBar from "$lib/components/shell/TopBar.svelte";
  import Carousel from "$lib/components/mascots/Carousel.svelte";
  import Hero from "$lib/components/mascots/Hero.svelte";
  import { MASCOTS } from "$lib/mascots";
  import { HOME } from "$lib/gate";
  import { me } from "$lib/user.svelte";
  import { warn } from "$lib/notice.svelte";

  let selected = $state<string | null>(null);
  let engaged = $state(false);

  const chosen = $derived(selected === null ? null : (MASCOTS[selected] ?? null));

  async function confirm() {
    const dorm = selected === null ? undefined : MASCOTS[selected]?.mascot.dorm;

    if (dorm && !(await me.chooseDorm(dorm))) {
      warn("Couldn't save your dorm. We'll try again later.");
    }

    goto(HOME);
  }
</script>

<svelte:head><title>{chosen?.mascot.name ?? "Dorm Mascots"}</title></svelte:head>

<div class="screen">
  <TopBar />

  <Hero mascot={engaged ? (chosen?.mascot ?? null) : null} />

  <Carousel bind:selected bind:engaged />

  <div class="actions">
    <Button onclick={confirm}>Confirm</Button>
  </div>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    padding: calc(27px + var(--safe-top)) var(--safe-right) max(14px, var(--safe-bottom))
      var(--safe-left);
    overflow: hidden;
    background: var(--highlight);
  }
  .actions {
    flex: none;
    width: 100%;
    max-width: var(--sheet);
    margin-inline: auto;
    padding: 24px 16px 0;
  }
</style>
