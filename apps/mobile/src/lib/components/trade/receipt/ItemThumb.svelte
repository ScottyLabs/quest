<script lang="ts">
  let { label }: { label: string } = $props();
</script>

<span class="thumb" role="img" aria-label={label}>
  <span class="face"></span>
</span>

<style>
  .thumb {
    --skibo: #9a1023;

    display: grid;
    width: calc(90.1 * var(--u));
    height: calc(84.35 * var(--u));
    border-radius: calc(18.6 * var(--u));
    background: var(--highlight);
    place-items: center;
    rotate: -7.57deg;
  }

  .face {
    display: block;
    width: calc(71.84 * var(--u));
    height: calc(67.52 * var(--u));
    border-radius: calc(12 * var(--u));
    background: var(--skibo);
  }
</style>
