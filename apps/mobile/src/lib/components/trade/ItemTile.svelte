<script lang="ts">
  let {
    art,
    size,
    face = "var(--skibo)",
    shade = null,
    tilt = "front",
  }: {
    art: string | null;
    size: number;
    face?: string;
    shade?: string | null;
    tilt?: "front" | "back";
  } = $props();

  const FRONT = "rotate(-7.57deg) skewX(1.1deg)";
  const BACK = "rotate(-6.69deg) skewX(3.13deg)";

  const turn = $derived(tilt === "back" ? BACK : FRONT);
</script>

<span class="tile" style:--tile={size}>
  {#if shade !== null}
    <span class="plate" style:background={shade} style:transform={BACK}></span>
  {/if}
  <span class="plate front" style:background={face} style:transform={turn}></span>
  {#if art !== null}
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

  .plate,
  img {
    grid-area: 1 / 1;
  }

  .plate {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: calc(12 * var(--u));
    translate: calc(-2.5 * var(--u)) calc(2.5 * var(--u));
  }

  .front {
    translate: none;
  }

  img {
    position: relative;
    z-index: 1;
    display: block;
    width: 62%;
    height: 62%;
    object-fit: contain;
  }
</style>
