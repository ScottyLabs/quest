<script lang="ts">
  let { percent }: { percent: number } = $props();

  const filled = $derived(Math.min(100, Math.max(0, percent)));
</script>

<div class="track">
  <div class="rail">
    <div class="fill" style:width="{filled}%">
      <span class="gleam"></span>
    </div>
  </div>
</div>

<style>
  .track {
    width: calc(214 * var(--u));
    height: calc(25.37 * var(--u));
    padding: calc(4.05 * var(--u));
    border-radius: calc(12.685 * var(--u));
    box-shadow: 0 calc(3.25 * var(--u)) 0 var(--edge);
    background: var(--highlight);
  }

  .rail {
    overflow: hidden;
    width: 100%;
    height: 100%;
    border-radius: calc(8.6 * var(--u));
    background: #541c7e;
  }

  .fill {
    position: relative;
    height: 100%;
    border-radius: calc(8.6 * var(--u));
    background: #a32efa;
  }

  .gleam {
    position: absolute;
    top: calc(3.55 * var(--u));
    right: calc(10.4 * var(--u));
    left: calc(5.21 * var(--u));
    height: calc(2.46 * var(--u));
    border-radius: calc(1.23 * var(--u));
    background: #c69de4;
  }
</style>
