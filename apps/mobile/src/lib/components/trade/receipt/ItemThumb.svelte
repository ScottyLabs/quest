<script lang="ts">
  import ItemTile from "../ItemTile.svelte";

  let { label, art = null }: { label: string; art?: string | null } = $props();
</script>

<span class="thumb" role="img" aria-label={label}>
  <ItemTile {art} size={71.84} />
</span>

<style>
  .thumb {
    display: grid;
    width: calc(90.1 * var(--u));
    height: calc(84.35 * var(--u));
    border-radius: calc(18.6 * var(--u));
    background: var(--highlight);
    place-items: center;
  }
</style>
