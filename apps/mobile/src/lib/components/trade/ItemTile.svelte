<script lang="ts">
  let {
    art,
    size,
    dimmed = false,
  }: {
    art: string | null;
    size: number;
    dimmed?: boolean;
  } = $props();
</script>

<span class="tile" class:dimmed style:--tile={size}>
  {#if art === null}
    <span class="empty"></span>
  {:else}
    <img src={art} alt="" />
  {/if}
</span>

<style>
  .tile {
    display: grid;
    flex: none;
    width: calc(var(--tile) * var(--u));
    height: calc(var(--tile) * var(--u));
    place-items: center;
  }

  .empty,
  img {
    grid-area: 1 / 1;
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
