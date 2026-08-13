<script lang="ts">
  import { inlineImages } from "$lib/images";
  import { centreCardText } from "$lib/layout";
  import { flattenMasks } from "$lib/masks";
  import { loadFonts, outlineText } from "$lib/outline";

  interface Props {
    svg: string | null;
    name: string;
    code: string;
    slug: string;
    category: string;
    tint?: string;
    included: boolean;
    valid: boolean;
    oncode: (value: string) => void;
    ontoggle: () => void;
  }

  let {
    svg,
    name,
    code,
    slug,
    category,
    tint = "var(--tertiary)",
    included,
    valid,
    oncode,
    ontoggle,
  }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let near = $state(false);

  const status = $derived(svg === null ? "absent" : valid ? "ready" : "waiting");

  $effect(() => {
    const node = host;
    if (node === null || near) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) near = true;
      },
      { rootMargin: "700px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  });

  $effect(() => {
    const node = host;
    if (node === null || svg === null || !near) return;

    let dropped = false;
    const inner = node.querySelector("svg");
    if (inner === null) return;

    void loadFonts().then(() => {
      if (dropped) return;
      centreCardText(inner);
      flattenMasks(inner);
      inlineImages(inner);
      outlineText(inner);
    });

    return () => {
      dropped = true;
    };
  });

  function hop(event: KeyboardEvent): void {
    if (event.key !== "Enter") return;
    const inputs = [...document.querySelectorAll<HTMLInputElement>("input.code")];
    const next = inputs[inputs.indexOf(event.currentTarget as HTMLInputElement) + 1];
    next?.focus();
    next?.select();
  }
</script>

<article class:muted={!included} data-slug={slug} style="--tint: {tint}">
  <div class="frame" bind:this={host}>
    {#if svg !== null && near}
      {@html svg}
    {:else if svg === null}
      <p class="absent">no template<br /><strong>{category}</strong></p>
    {/if}

    <label class="pick" title={included ? "Included" : "Skipped"}>
      <input type="checkbox" checked={included} onchange={ontoggle} aria-label="Include {name}" />
      <span></span>
    </label>

    <span class="state {status}" aria-hidden="true"></span>
  </div>

  <div class="meta">
    <span class="name" title={name}>{name}</span>
    <input
      type="text"
      class="code"
      class:bad={code !== "" && !valid}
      value={code}
      maxlength="4"
      placeholder="----"
      spellcheck="false"
      aria-label="Code for {name}"
      oninput={(event) => oncode(event.currentTarget.value)}
      onkeydown={hop}
    />
  </div>
</article>

<style>
  article {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    transition: opacity 140ms ease;
  }

  article.muted {
    opacity: 0.42;
  }

  .frame {
    position: relative;
    display: grid;
    place-items: center;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    padding: 0.45rem;
    border: 1px solid var(--tertiary-dark);
    border-top: 3px solid var(--tint);
    border-radius: 12px;
    background: var(--highlight);
    box-shadow: 0 1px 0 var(--tertiary-dark);
    transition: transform 140ms ease, box-shadow 140ms ease;
  }

  .frame:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 28px -18px rgb(0 0 0 / 0.55);
  }

  .frame :global(svg) {
    display: block;
    max-width: 100%;
    max-height: 100%;
    height: auto;
    width: auto;
  }

  .pick {
    position: absolute;
    top: 0.35rem;
    left: 0.35rem;
    cursor: pointer;
  }

  .pick input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }

  .pick span {
    display: grid;
    place-items: center;
    width: 1.15rem;
    height: 1.15rem;
    border: 2px solid var(--tertiary);
    border-radius: 6px;
    background: color-mix(in srgb, var(--highlight) 80%, transparent);
  }

  .pick input:checked + span {
    border-color: var(--quest-done-ink);
    background: var(--quest-done-ink);
  }

  .pick input:checked + span::after {
    content: "";
    width: 0.32rem;
    height: 0.6rem;
    margin-top: -0.15rem;
    border: solid var(--highlight);
    border-width: 0 2px 2px 0;
    transform: rotate(42deg);
  }

  .pick input:focus-visible + span {
    outline: 3px solid var(--quest-coin);
    outline-offset: 1px;
  }

  .state {
    position: absolute;
    right: 0.4rem;
    top: 0.4rem;
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    box-shadow: 0 0 0 2px var(--highlight);
  }

  .state.ready {
    background: var(--quest-done-ink);
  }

  .state.waiting {
    background: var(--quest-coin);
  }

  .state.absent {
    background: var(--primary);
  }

  .absent {
    margin: 0;
    text-align: center;
    font-size: 0.78rem;
    line-height: 1.45;
    font-weight: 600;
    color: var(--primary);
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ink-shade);
  }

  .code {
    flex: none;
    width: 4.6rem;
    padding: 0.2rem 0.4rem;
    border-width: 1.5px;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-align: center;
    text-transform: uppercase;
  }

  .code.bad {
    border-color: var(--primary);
    background: #fdecef;
  }

  @media (prefers-reduced-motion: reduce) {
    article,
    .frame {
      transition: none;
    }
  }
</style>
