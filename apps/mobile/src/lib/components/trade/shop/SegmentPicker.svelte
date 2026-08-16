<script lang="ts">
  let {
    label,
    choices,
    value,
    onpick,
  }: {
    label: string;
    choices: readonly string[];
    value: string;
    onpick: (choice: string) => void;
  } = $props();
</script>

<div class="control" role="group" aria-label={label}>
  {#each choices as choice (choice)}
    <button
      class="seg"
      class:on={choice === value}
      type="button"
      aria-pressed={choice === value}
      onclick={() => onpick(choice)}
    >
      {choice}
    </button>
  {/each}
</div>

<style>
  .control {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: calc(35 * var(--u));
    padding: calc(2 * var(--u));
    border: 1px solid var(--trade-control);
    border-radius: calc(8 * var(--u));
    background: var(--tertiary-normal);
    filter: drop-shadow(0 calc(4 * var(--u)) 0 var(--trade-control));
  }

  .seg {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: calc(8 * var(--u));
    border: 0;
    border-radius: calc(7 * var(--u));
    background: none;
    color: var(--secondary);
    font: inherit;
    font-size: calc(14 * var(--u));
    font-weight: 600;
    line-height: calc(24 * var(--u));
    text-align: center;
    cursor: pointer;
  }

  .on {
    background: var(--highlight);
    filter: drop-shadow(0 calc(1 * var(--u)) calc(1 * var(--u)) rgb(0 0 0 / 0.16));
  }
</style>
