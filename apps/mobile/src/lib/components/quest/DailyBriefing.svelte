<script lang="ts">
  import { fade } from "svelte/transition";
  import { acknowledge } from "$lib/daily.svelte";
  import { MASCOTS } from "$lib/mascots";
  import { profile } from "$lib/user";
  import { DAILY_BONUS, DAILY_CLEARS, DAILY_GEMS } from "$lib/wallet.svelte";

  const cached = localStorage.getItem("quest.mascot");
  let slug = $state<string | null>(cached);
  let ready = $state(cached !== null);

  $effect(() => {
    void profile()
      .then((me) => {
        const found = Object.keys(MASCOTS).find((key) => MASCOTS[key]?.mascot.dorm === me?.dorm);
        if (found !== undefined) slug = found;
      })
      .finally(() => (ready = true));
  });

  const picked = $derived(slug === null ? null : (MASCOTS[slug] ?? null));
  const mascot = $derived(picked?.mascot ?? null);

  const art = $derived(`/img/mascots/hero/${slug ?? "scotty"}.svg`);
  const who = $derived(mascot?.name ?? "Scotty");
  const house = $derived(mascot?.home ?? "Orientation Quest");

  const ROWS = [
    {
      icon: "daily-pouch",
      w: 82,
      h: 60,
      lead: "Your Pouch",
      body: `Holds up to <b>${DAILY_GEMS} Gems</b> at a time.`,
    },
    {
      icon: "daily-challenges",
      w: 78,
      h: 77,
      lead: "Complete Challenges",
      body: `Your <em>first ${DAILY_CLEARS}</em> completed challenges each recover <em>one Gem</em> into your pouch.`,
    },
    {
      icon: "daily-bonus",
      w: 78,
      h: 77,
      lead: "Daily Bonus Quest",
      body: `Every day at <em>12 PM</em>, Scotty selects a special quest worth <b>${DAILY_BONUS} Gems</b>.`,
    },
    {
      icon: "daily-collection",
      w: 69,
      h: 85,
      lead: "Daily Collection",
      body: "At <em>12 PM</em> each day, your <em>pouch is emptied</em> and its <em>Gems are banked</em> toward your Housing Community total.",
    },
  ];

  let room = $state<HTMLElement | null>(null);
  let sheet = $state<HTMLElement | null>(null);
  let fit = $state(1);

  $effect(() => {
    const outer = room;
    const inner = sheet;
    if (outer === null || inner === null) return;


    const measure = () => {
      const pad = getComputedStyle(outer);
      const wide = outer.clientWidth - parseFloat(pad.paddingLeft) - parseFloat(pad.paddingRight);
      const tall = outer.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom);
      if (inner.offsetWidth === 0 || inner.offsetHeight === 0) return;

      fit = Math.min(1, wide / inner.offsetWidth, tall / inner.offsetHeight);
    };

    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(outer);
    watch.observe(inner);

    return () => watch.disconnect();
  });
</script>

{#if ready}
  <div
    class="full"
    style:--house={mascot?.fill ?? "var(--accent)"}
    style:--deep={mascot?.edge ?? "var(--sink)"}
    role="dialog"
    aria-modal="true"
    aria-label="{who} needs your help"
    transition:fade={{ duration: 180 }}
  >
    <header>
      <img class="art" src={art} alt="" />
      <p class="house">{house}</p>
    </header>

    <div class="body" bind:this={room}>
      <div class="column" bind:this={sheet} style:--fit={fit}>
        <h2>{who} Needs Your Help!</h2>

        <p class="intro">
          Someone's made off with the
          <img class="gem" src="/img/quest/daily-gem.svg" alt="" />
          <b>Gems</b> and scattered them across campus, hidden inside this week's challenges.
        </p>

        <ul>
          {#each ROWS as row (row.icon)}
            <li>
              <img
                src="/img/quest/{row.icon}.svg"
                alt=""
                style:--w="calc({row.w} * var(--u))"
                style:--h="calc({row.h} * var(--u))"
              />
              <p><strong>{row.lead} &mdash;</strong> {@html row.body}</p>
            </li>
          {/each}
        </ul>

        <p class="callout">
          <strong>The larger the percentage of Gems you recover,</strong> the
          <strong>more Carnegie Cup points</strong> your housing community earns at the end of the
          week.
        </p>

        <button type="button" onclick={acknowledge}>I Understand</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .full {
    position: fixed;
    z-index: 60;
    display: flex;
    flex-direction: column;
    inset: 0;
    background: var(--highlight);
  }

  header {
    position: relative;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: flex-end;
    height: calc(var(--safe-top) + 189 * var(--u));
    overflow: hidden;
    padding: var(--safe-top) calc(44 * var(--u)) 0 0;
    background: var(--house);
  }

  .art {
    position: absolute;
    top: calc(var(--safe-top) + (189 * var(--u)) / 2);
    left: calc(16 * var(--u));
    width: calc(210 * var(--u));
    height: calc(168 * var(--u));
    object-fit: contain;
    translate: 0 calc(-50% - 2 * var(--u));
  }

  .house {
    max-width: calc(170 * var(--u));
    margin: 0;
    color: var(--highlight);
    font-size: calc(22 * var(--u));
    font-style: italic;
    font-weight: 700;
    line-height: 1.2;
    text-align: right;
  }

  .body {
    display: grid;
    flex: 1;
    min-height: 0;
    padding:
      calc(16 * var(--u)) calc(var(--safe-right) + 30 * var(--u))
      calc(var(--dock-gap) + 8 * var(--u)) calc(var(--safe-left) + 30 * var(--u));
    place-items: center;
  }

  .column {
    width: 100%;
    max-width: calc(430 * var(--u));
    scale: var(--fit);
  }

  h2 {
    margin: 0 0 calc(10 * var(--u));
    color: var(--secondary);
    font-size: calc(22 * var(--u));
    font-style: italic;
    font-weight: 700;
  }

  .intro {
    margin: 0 0 calc(7 * var(--u));
    color: #6d6e71;
    font-size: calc(15 * var(--u));
    line-height: 1.45;
  }

  .gem {
    width: calc(17 * var(--u));
    height: calc(18 * var(--u));
    vertical-align: calc(-3 * var(--u));
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: calc(13 * var(--u));
    margin: calc(15 * var(--u)) 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: calc(21 * var(--u));
  }

  li img {
    flex: none;
    width: var(--w);
    height: var(--h);
  }

  li p {
    margin: 0;
    color: #6d6e71;
    font-size: calc(15 * var(--u));
    line-height: 1.45;
  }

  li strong {
    color: var(--secondary);
  }

  .body :global(b) {
    color: #7a1bd2;
    font-weight: 700;
  }

  .body :global(em) {
    color: var(--house);
    font-style: normal;
    font-weight: 700;
  }

  .callout {
    margin: 0;
    padding: calc(14 * var(--u)) calc(18 * var(--u));
    border-radius: calc(12 * var(--u));
    background: color-mix(in srgb, var(--house) 16%, #ffffff);
    color: var(--deep);
    font-size: calc(15 * var(--u));
    line-height: 1.45;
  }

  .callout strong {
    font-weight: 700;
  }

  button {
    display: block;
    width: 100%;
    margin-top: calc(16 * var(--u));
    padding: calc(21 * var(--u));
    border: 0;
    border-radius: calc(15 * var(--u));
    background: var(--house);
    color: var(--highlight);
    font: inherit;
    font-size: calc(21 * var(--u));
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
  }

  button:active {
    background: var(--deep);
  }
</style>
