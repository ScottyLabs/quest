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
    gap: 8px;
    padding: 0 14px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .rail::-webkit-scrollbar {
    display: none;
  }

  .chip {
    flex: none;
    padding: 10px;
    border: 0;
    border-radius: 4px;
    background: none;
    color: var(--highlight);
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.26px;
    white-space: nowrap;
    cursor: pointer;
  }

  .chip.on {
    background: rgb(255 255 255 / 0.25);
  }
</style>
