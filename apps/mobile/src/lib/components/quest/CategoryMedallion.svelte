<script lang="ts">
  import type { Theme } from "$lib/theme";

  let { theme }: { theme: Theme } = $props();
</script>

<div class="ring">
  <div class="disc">
    {#if theme.logo}
      <img src={theme.logo} alt={theme.label} width="58" height="58" />
    {/if}
  </div>
</div>

<style>
  .ring {
    display: grid;
    width: 105px;
    height: 105px;
    border-radius: 50%;
    background: var(--highlight);
    place-items: center;
  }

  .disc {
    display: grid;
    width: 88px;
    height: 88px;
    border-radius: 50%;
    background: var(--accent);
    place-items: center;
  }
</style>
