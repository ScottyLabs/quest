<script lang="ts">
  import type { Mascot } from "$lib/mascots";

  let {
    mascot,
    picked = false,
    onpick,
  }: { mascot: Mascot; picked?: boolean; onpick: (slug: string) => void } = $props();
</script>

<button
  class="tile"
  class:up={picked}
  data-slug={mascot.slug}
  style:background={mascot.fill}
  style:border-color={mascot.edge}
  style:--shade={mascot.shade}
  aria-pressed={picked}
  aria-label={mascot.name}
  onclick={() => onpick(mascot.slug)}
>
  <img src="/img/mascots/{mascot.slug}.svg" alt="" />
</button>

<style>
  .tile {
    display: grid;
    width: 100px;
    height: 100px;
    padding: 0;
    border: 5px solid;
    border-radius: 23px;
    box-shadow: 0 4px 0 0 var(--shade);
    cursor: pointer;
    overflow: clip;
    scroll-snap-align: center;
    place-items: center;
    transition:
      transform 180ms ease,
      box-shadow 180ms ease;
  }
  .tile img {
    width: 75px;
    height: 75px;
    object-fit: contain;
  }
  .tile.up {
    box-shadow: 0 24px 0 0 var(--shade);
    transform: translateY(-20px);
  }
</style>
