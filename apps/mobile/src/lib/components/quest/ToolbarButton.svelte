<script lang="ts">
  let {
    icon,
    label,
    width,
    height,
    disc = false,
    onclick,
  }: {
    icon: string;
    label: string;
    width: number;
    height: number;
    disc?: boolean;
    onclick?: () => void;
  } = $props();
</script>

<button
  class="tool"
  class:disc
  type="button"
  aria-label={label}
  style:--w="calc({width} * var(--u))"
  style:--h="calc({height} * var(--u))"
  onclick={() => onclick?.()}
>
  <img src={icon} alt="" />
</button>

<style>
  .tool {
    display: grid;
    flex: none;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    place-items: center;
  }

  .tool:active {
    opacity: 0.6;
  }

  .disc {
    position: relative;
    z-index: 3;
    width: calc(45 * var(--u));
    height: calc(43 * var(--u));
    border-radius: 50%;
    background: var(--highlight);
  }

  img {
    display: block;
    width: var(--w);
    height: var(--h);
    object-fit: contain;
  }
</style>
