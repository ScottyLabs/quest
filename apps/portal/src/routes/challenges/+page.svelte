<script lang="ts">
  import Chip from "$lib/components/Chip.svelte";
  import Browser from "$lib/components/domain/Browser.svelte";

  const CATEGORIES = [
    "essentials",
    "cool_corners",
    "bridges",
    "lets_eat",
    "minor_major_general",
    "residence_relaxation",
  ];

  let search = $state("");

  const chosen = $derived(CATEGORIES.includes(search) ? search : null);
</script>

<header class="head">
  <h1>Challenges</h1>
  <p>
    The quest board. Every row here is one thing a student can find, tap and earn ScottyCoins for, so
    the wording, the category and the coin value are what the app shows and what the leaderboard is
    built from.
  </p>
</header>

<Browser
  table="challenge"
  title="Quest board"
  detail="Pick a row to edit it. Sort by clicking a column heading."
  group="orientation-staff or challenge-placer"
  columns={["name", "category", "coin_value", "open_from", "location", "id"]}
  searchHint="name, tagline or category"
  createHint="Creating a challenge needs an id: challenge.id has no database default, so paste a
    fresh UUID into the id field or the insert fails."
  bind:search
>
  <div class="legend">
    <p>
      <Chip tone="warn">open_from</Chip>
      A challenge stays hidden in the app until <code>open_from</code> passes. A future timestamp is
      a scheduled reveal, not a draft, and clearing it is not possible: the column is not nullable.
    </p>

    <p>
      <Chip tone="bad">coin_value</Chip>
      Balances are derived from taps, never stored. Changing <code>coin_value</code> retroactively
      rewrites what every student who already tapped this challenge is worth, so the leaderboard
      moves the moment you save.
    </p>

    <p>
      <Chip tone="accent">location</Chip>
      Geography comes back as WKT, <code>POINT(lon lat)</code>, longitude first.
    </p>
  </div>

  <div class="filter">
    <p class="caption">Jump to a category</p>

    <div class="chips">
      <button type="button" class:on={chosen === null} onclick={() => (search = "")}>All</button>

      {#each CATEGORIES as category (category)}
        <button
          type="button"
          class:on={chosen === category}
          onclick={() => (search = category)}
        >
          {category}
        </button>
      {/each}
    </div>

    <p class="honest">
      These buttons type the category name into the search box above. Search is a substring match
      across every column, so a row whose name, tagline or description happens to contain the word
      shows up too. It is a shortcut, not a strict <code>category =</code> filter, and the count
      below reflects whatever the search matched.
    </p>
  </div>
</Browser>

<style>
  .head {
    max-width: 46rem;
    margin: 0 0 24px;
  }

  h1 {
    margin: 0 0 6px;
    font-size: 24px;
    font-weight: 800;
  }

  .head p {
    margin: 0;
    color: var(--tertiary);
    font-size: 13px;
    line-height: 1.6;
  }

  .legend {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .legend p {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin: 0;
    color: var(--tertiary);
    font-size: 12px;
    line-height: 1.6;
  }

  .filter {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }

  .caption {
    margin: 0 0 8px;
    color: var(--ink-shade);
    font-size: 12px;
    font-weight: 700;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .chips button {
    padding: 4px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--highlight);
    color: var(--tertiary);
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }

  .chips button:hover {
    border-color: var(--muted);
  }

  .chips button.on {
    border-color: var(--accent);
    background: var(--tint);
    color: var(--shade);
  }

  .honest {
    margin: 10px 0 0;
    color: var(--tertiary);
    font-size: 12px;
    line-height: 1.6;
  }

  code {
    color: var(--ink-shade);
    font-family: var(--mono);
    font-size: 11px;
  }
</style>
