<script lang="ts">
  import { goto } from "$app/navigation";
  import IntroCarousel from "$lib/components/onboarding/IntroCarousel.svelte";
  import { authMessage, session } from "$lib/auth";
  import { profile } from "$lib/user";
  import { warn } from "$lib/notice.svelte";

  $effect(() => {
    if (session.signedIn) void goto("/app", { replaceState: true });
  });

  async function login() {
    try {
      await session.login();
      await goto((await profile())?.dorm ? "/app" : "/mascots");
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
