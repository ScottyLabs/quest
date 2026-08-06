<script lang="ts">
  import type { Snippet } from "svelte";

  let { leading, value, label }: { leading: Snippet; value: string; label: string } = $props();
</script>

<p class="pill" aria-label="{label}: {value}">
  {@render leading()}
  <span>{value}</span>
</p>

<style>
  .pill {
    display: flex;
    align-items: center;
    gap: 7px;
    height: 38px;
    margin: 0;
    padding: 0 14px 0 5px;
    border-radius: 47px;
    background: var(--highlight);
    color: var(--secondary);
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0.4px;
    white-space: nowrap;
  }
</style>
