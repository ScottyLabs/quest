<script lang="ts">
  interface Props {
    svg: string | null;
    name: string;
    code: string;
    category: string;
  }

  let { svg, name, code, category }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let near = $state(false);

  $effect(() => {
    const node = host;
    if (node === null || near) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) near = true;
      },
      { rootMargin: "600px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  });
</script>

<figure>
  <div class="frame" bind:this={host}>
    {#if svg !== null && near}
      {@html svg}
    {:else if svg === null}
      <p class="absent">No template for<br /><strong>{category}</strong></p>
    {/if}
  </div>
  <figcaption>
    <span class="name" title={name}>{name}</span>
    <code class:unset={code === ""}>{code === "" ? "----" : code}</code>
  </figcaption>
</figure>

<style>
  figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .frame {
    display: grid;
    place-items: center;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    padding: 0.5rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
  }

  .frame :global(svg) {
    display: block;
    max-width: 100%;
    max-height: 100%;
    height: auto;
    width: auto;
  }

  .absent {
    margin: 0;
    text-align: center;
    font-size: 0.85rem;
    line-height: 1.4;
    color: var(--warn);
  }

  figcaption {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ink-soft);
  }

  code {
    flex: none;
    font-weight: 600;
  }

  code.unset {
    color: var(--warn);
  }
</style>
