<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/components/Button.svelte";
  import TopBar from "$lib/components/TopBar.svelte";
  import Carousel from "$lib/components/mascots/Carousel.svelte";
  import Hero from "$lib/components/mascots/Hero.svelte";
  import { MASCOTS } from "$lib/mascots";
  import { setDorm } from "$lib/user";
  import { warn } from "$lib/notice.svelte";

  const HOME = "/app";

  let selected = $state<string | null>(null);
  let engaged = $state(false);

  const chosen = $derived(selected === null ? null : (MASCOTS[selected] ?? null));

  async function confirm() {
    if (selected !== null) {
      localStorage.setItem("quest.mascot", selected);

      const dorm = MASCOTS[selected]?.mascot.dorm;
      if (dorm && !(await setDorm(dorm))) warn("Couldn't save your dorm. We'll try again later.");
    }

    goto(HOME);
  }
</script>

<svelte:head><title>{chosen?.mascot.name ?? "Dorm Mascots"}</title></svelte:head>

<div class="screen">
  <TopBar onback={() => goto(HOME)} onskip={() => goto(HOME)} />

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
    padding: 24px 16px 0;
  }
</style>
