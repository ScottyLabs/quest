<script lang="ts">
  let { done, total }: { done: number; total: number } = $props();
</script>

<p class="tally" aria-label="{done} of {total} cleared">
  <span class="done">{done}</span><span class="total">/{total}</span>
</p>

<style>
  .tally {
    position: absolute;
    top: calc(55 * var(--u));
    right: calc(20 * var(--u));
    margin: 0;
    font-style: italic;
    font-stretch: 75%;
    letter-spacing: calc(0.48 * var(--u));
    text-shadow: 0 calc(5 * var(--u)) 0 rgb(0 0 0 / 0.25);
    white-space: nowrap;
  }

  .done {
    color: var(--highlight);
    font-size: calc(40 * var(--u));
  }

  .total {
    color: color-mix(in srgb, var(--accent) 45%, #ffffff);
    font-size: calc(24 * var(--u));
  }
</style>
