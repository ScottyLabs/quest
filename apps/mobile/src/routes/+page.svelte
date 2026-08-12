<script lang="ts">
  import IntroCarousel from "$lib/components/onboarding/IntroCarousel.svelte";
  import { authMessage, session } from "$lib/auth";
  import { steer, WELCOME } from "$lib/gate";
  import { warn } from "$lib/notice.svelte";

  $effect(() => steer(WELCOME));

  async function login() {
    try {
      await session.login();
    } catch (error) {
      console.error("sign-in failed", error);
      if (!session.deviceOwned) warn(authMessage(error));
    }
  }
</script>

<svelte:head><title>Orientation Quest</title></svelte:head>

{#if !session.signedIn}
  <IntroCarousel cta="Log In" onfinish={login} />
{/if}
