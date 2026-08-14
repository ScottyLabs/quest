<script lang="ts">
  import { HOUSES } from "$lib/mascots";
  import Tile from "./Tile.svelte";

  let {
    selected = $bindable(null),
    engaged = $bindable(false),
  }: { selected?: string | null; engaged?: boolean } = $props();

  let centred = $state(0);
  const house = $derived(HOUSES[centred]);

  let rail: HTMLElement | null = null;
  let steering = false;
  let steer: ReturnType<typeof setTimeout>;
  let pushing: "start" | "end" | null = null;

  const houses = (node: HTMLElement) => [...node.querySelectorAll<HTMLElement>("[data-house]")];
  const tilesOf = (node: HTMLElement) => [...node.querySelectorAll<HTMLElement>("[data-slug]")];

  function track(node: HTMLElement) {
    const centreLine = () => {
      const box = node.getBoundingClientRect();
      return box.left + box.width / 2;
    };

    const nearestTo = <T extends HTMLElement>(items: T[]) => {
      const middle = centreLine();
      let nearest: T | undefined;
      let best = Infinity;

      for (const item of items) {
        const box = item.getBoundingClientRect();
        const distance = Math.abs(box.left + box.width / 2 - middle);
        if (distance < best) {
          best = distance;
          nearest = item;
        }
      }
      return nearest;
    };

    const follow = () => {
      const all = houses(node);
      const near = nearestTo(all);
      if (near) centred = all.indexOf(near);
    };

    const choose = () => {
      const tiles = tilesOf(node);
      const tile =
        pushing === "start" ? tiles.at(0) : pushing === "end" ? tiles.at(-1) : nearestTo(tiles);
      selected = tile?.dataset["slug"] ?? selected;
    };

    const reserve = () => {
      const tiles = tilesOf(node);
      const first = tiles.at(0);
      const last = tiles.at(-1);
      if (!first || !last) return;
      node.style.setProperty("--lead", `${first.offsetWidth / 2}px`);
      node.style.setProperty("--tail", `${last.offsetWidth / 2}px`);
      follow();
    };

    const atStart = () => node.scrollLeft <= 1;
    const atEnd = () => node.scrollLeft >= node.scrollWidth - node.clientWidth - 1;

    const scrolled = () => {
      follow();
      if (node.scrollLeft < 0) pushing = "start";
      else if (node.scrollLeft > node.scrollWidth - node.clientWidth) pushing = "end";
      else if (!atStart() && !atEnd()) pushing = null;

      if (engaged && !steering) choose();
    };

    const pushed = (event: WheelEvent) => {
      engaged = true;

      const inward = pushing === "end" ? event.deltaX < 0 : pushing === "start" && event.deltaX > 0;
      if (inward) {
        event.preventDefault();
        pushing = null;
        choose();
        return;
      }

      if (event.deltaX > 0 && atEnd()) pushing = "end";
      else if (event.deltaX < 0 && atStart()) pushing = "start";
      else pushing = null;
      choose();
    };

    const engage = () => {
      engaged = true;
    };

    rail = node;
    reserve();
    const resize = new ResizeObserver(reserve);
    resize.observe(node);
    node.addEventListener("scroll", scrolled, { passive: true });
    node.addEventListener("scrollend", () => (steering = false));
    node.addEventListener("wheel", pushed);
    for (const kind of ["pointerdown", "touchstart", "keydown"]) {
      node.addEventListener(kind, engage, { passive: true });
    }
    return () => {
      clearTimeout(steer);
      resize.disconnect();
      node.removeEventListener("scroll", scrolled);
      node.removeEventListener("wheel", pushed);
      for (const kind of ["pointerdown", "touchstart", "keydown"]) {
        node.removeEventListener(kind, engage);
      }
      rail = null;
    };
  }

  function pick(slug: string) {
    engaged = true;
    steering = true;
    selected = slug;
    clearTimeout(steer);
    steer = setTimeout(() => (steering = false), 600);

    const tile = rail?.querySelector<HTMLElement>(`[data-slug="${slug}"]`);
    if (!rail || !tile) return;

    const box = rail.getBoundingClientRect();
    const target = tile.getBoundingClientRect();
    rail.scrollTo({
      left: rail.scrollLeft + (target.left + target.width / 2) - (box.left + box.width / 2),
      behavior: "smooth",
    });
  }
</script>

<div class="rail" style:--strip={house?.strip} {@attach track}>
  <div class="houses">
    {#each HOUSES as group (group.id)}
      <div class="house" data-house={group.id}>
        <p class="label" class:quiet={group.id !== house?.id}>{group.label}</p>
        <div class="band" style:background={group.band}>
          {#each group.mascots as mascot (mascot.slug)}
            <Tile {mascot} picked={selected === mascot.slug} onpick={pick} />
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .rail {
    flex: none;
    margin-top: auto;
    padding: 24px 0;
    overflow-x: auto;
    background: var(--strip);
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
    transition: background 200ms ease;
  }
  .rail::-webkit-scrollbar {
    display: none;
  }
  .houses {
    display: flex;
    align-items: flex-end;
    width: max-content;
    padding: 45px calc(50% - var(--tail, 60px)) 0 calc(50% - var(--lead, 60px));
    gap: 24px;
  }
  .house {
    position: relative;
    display: flex;
  }
  .label {
    position: absolute;
    bottom: calc(100% + 12px);
    left: 50%;
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: 0.15px;
    white-space: nowrap;
    translate: -50% 0;
    transition: opacity 200ms ease;
  }
  .label.quiet {
    opacity: 0.25;
  }
  .band {
    display: flex;
    padding: 10px 10px 12px;
    border-radius: 32px;
    gap: 20px;
  }
</style>
