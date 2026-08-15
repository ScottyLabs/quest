<script lang="ts">
  import Chip from "$lib/components/Chip.svelte";
  import Browser from "$lib/components/domain/Browser.svelte";

  function live(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    return rows.filter((row) => row.retired_at === null);
  }

  let liveOnly = $state(false);
</script>

<header class="head">
  <h1>Cards</h1>
  <p>
    NFC card assignment and placement. Each row ties one physical card to one challenge and, once you
    have walked it out to where it lives, to the point on campus where a student will find it.
  </p>
</header>

<Browser
  table="challenge_card"
  title="Cards"
  detail="Pick a row to reassign, retire or move a card. Sort by clicking a column heading."
  group="orientation-staff or challenge-placer"
  columns={["card_id", "challenge_id", "location", "retired_at", "created_at"]}
  searchHint="card ID or challenge ID"
  createHint="A new card needs a card_id of exactly 14 uppercase hex characters and a challenge_id
    that already exists. Both are checked by the database, not by this form."
  refine={liveOnly ? live : undefined}
  filterName="the live-only filter"
>
  <div class="legend">
    <p>
      <Chip tone="accent">card_id</Chip>
      The primary key, and the value printed on the card. The database enforces
      <code>{"^[0-9A-F]{14}$"}</code>: exactly 14 characters, digits and
      <code>A</code>&ndash;<code>F</code> only, uppercase. Lowercase hex is rejected.
    </p>

    <p>
      <Chip tone="warn">retired_at</Chip>
      Empty means the card is live and taps against it count. A timestamp means the card is retired
      and out of play. Retiring is how a card leaves service; the row stays for the tap history that
      points at it.
    </p>

    <p>
      <Chip tone="neutral">location</Chip>
      WKT, <code>POINT(lon lat)</code> &mdash; longitude first, then latitude. Leave it empty for a
      card you have not placed yet.
    </p>
  </div>

  <div class="filter">
    <div class="chips">
      <button type="button" class:on={!liveOnly} onclick={() => (liveOnly = false)}>
        All cards
      </button>
      <button type="button" class:on={liveOnly} onclick={() => (liveOnly = true)}>
        Live only
      </button>
    </div>

    <p class="honest">
      Live only is a client-side filter. The row API cannot ask the database for
      <code>retired_at IS NULL</code>, so this hides retired rows out of the page already fetched and
      nothing more: it does not narrow the whole table, does not change the row count below, and
      retired cards on other pages stay where they are. Page through to see them all.
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
