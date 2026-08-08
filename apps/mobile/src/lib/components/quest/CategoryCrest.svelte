<script lang="ts">
  import type { Theme } from "$lib/theme";

  let { theme, size = 97 }: { theme: Theme; size?: number } = $props();
</script>

<span class="crest" style:--size="calc({size} * var(--u))">
  {#if theme.logo}
    <img src={theme.logo} alt="" />
  {/if}
</span>

<style>
  .crest {
    flex: none;
    width: var(--size);
    height: var(--size);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: bottom center;
  }
</style>
