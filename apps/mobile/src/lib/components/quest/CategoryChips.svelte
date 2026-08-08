<script lang="ts">
  import { THEMES } from "$lib/theme";

  let {
    categories,
    current,
    onpick,
  }: { categories: string[]; current: string; onpick: (id: string) => void } = $props();

  let rail = $state<HTMLElement | null>(null);
  let settled = false;

  $effect(() => {
    const chip = rail?.querySelector(`[data-id="${current}"]`);
    if (!chip) return;

    const show = (behavior: ScrollBehavior) =>
      chip.scrollIntoView({ block: "nearest", inline: "center", behavior });

    show(settled ? "smooth" : "instant");
    if (settled) return;

    settled = true;
    void document.fonts.ready.then(() => show("instant"));
  });
</script>

<div class="rail" bind:this={rail} role="tablist" aria-label="Quest categories">
  {#each categories as id (id)}
    {@const on = id === current}
    <button
      class="chip"
      class:on
      data-id={id}
      role="tab"
      aria-selected={on}
      onclick={() => onpick(id)}
    >
      {THEMES[id]?.label ?? id}
    </button>
  {/each}
</div>

<style>
  .rail {
    display: flex;
    gap: calc(8 * var(--u));
    padding: 0 calc(23 * var(--u));
    overflow-x: auto;
    scrollbar-width: none;
  }

  .rail::-webkit-scrollbar {
    display: none;
  }

  .chip {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    min-width: calc(75 * var(--u));
    height: calc(30 * var(--u));
    padding: 0 calc(10 * var(--u));
    border: 0;
    border-radius: calc(4 * var(--u));
    background: none;
    color: rgb(255 255 255 / 0.66);
    font-family: inherit;
    font-size: calc(14 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.28 * var(--u));
    white-space: nowrap;
    cursor: pointer;
  }

  .chip.on {
    background: rgb(255 255 255 / 0.25);
    color: var(--highlight);
  }
</style>
