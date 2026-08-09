<script lang="ts">
  import { goto } from "$app/navigation";
  import IntroCarousel from "$lib/components/onboarding/IntroCarousel.svelte";
</script>

<svelte:head><title>How to Play - Orientation Quest</title></svelte:head>

<IntroCarousel
  cta="Got it!"
  label="How to play"
  onfinish={() => void goto("/app/info")}
/>
