<script lang="ts">
  let {
    art,
    size,
    height = size,
    dimmed = false,
  }: {
    art: string | null;
    size: number;
    height?: number;
    dimmed?: boolean;
  } = $props();
</script>

<span class="tile" class:dimmed style:--tile={size} style:--tall={height}>
  {#if art === null}
    <span class="empty"></span>
  {:else}
    <img src={art} alt="" />
  {/if}
</span>

<style>
  .tile {
    position: relative;
    display: block;
    flex: none;
    width: calc(var(--tile) * var(--u));
    height: calc(var(--tall) * var(--u));
  }

  .empty,
  img {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  .empty {
    border-radius: calc(12 * var(--u));
    background: var(--tertiary-normal);
  }

  img {
    object-fit: contain;
  }

  .dimmed img {
    filter: grayscale(1);
    opacity: 0.55;
  }
</style>
