<script lang="ts">
  import IntroCarousel from "$lib/components/onboarding/IntroCarousel.svelte";
  import { authMessage, session } from "$lib/auth";
  import { steer, WELCOME } from "$lib/gate";
  import { warn } from "$lib/notice.svelte";
  import { me } from "$lib/user.svelte";

  const pending = $derived(
    session.phase === "awaitingBrowser" || (session.signedIn && !me.settled),
  );

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

<IntroCarousel cta="Log In" onfinish={login} busy={pending} />
