<script lang="ts">
  let { fill }: { fill: string } = $props();
</script>

<span class="art">
  <span class="tile" style:background={fill}></span>
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
    width: calc(54 * var(--u));
    height: calc(51 * var(--u));
    border-radius: calc(12 * var(--u));
    transform: rotate(-7.65deg) skewX(0.94deg);
  }
</style>
