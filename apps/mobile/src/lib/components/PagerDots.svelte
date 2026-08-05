<script lang="ts">
  let { count, active }: { count: number; active: number } = $props();
</script>

<div class="dots" role="group" aria-label="Step {active + 1} of {count}">
  {#each { length: count }, i}
    <span class="dot" class:on={i === active}></span>
  {/each}
</div>

<style>
  .dots {
    display: flex;
    gap: 8px;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--tertiary-dark);
  }

  .dot.on {
    background: var(--primary);
  }
</style>
