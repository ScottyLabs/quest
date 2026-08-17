<script lang="ts">
  let {
    fill,
    icon,
  }: {
    fill: string;
    icon: string;
  } = $props();
</script>

<span class="art">
  <span class="tile" style:background={fill}>
    <img class="icon" src={icon} alt="" />
  </span>
</span>

<style>
  .art {
    display: grid;
    flex: none;
    width: calc(62 * var(--u));
    height: calc(58 * var(--u));
    place-items: center;
  }

  .tile {
    display: grid;
    width: calc(54 * var(--u));
    height: calc(51 * var(--u));
    border-radius: calc(12 * var(--u));
    transform: rotate(-7.65deg) skewX(0.94deg);
    place-items: center;
  }

  .icon {
    display: block;
    width: calc(32 * var(--u));
    height: calc(32 * var(--u));
    object-fit: contain;
  }
</style>