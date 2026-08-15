<script lang="ts">
  import { message } from "$lib/api/client";
  import Chip from "$lib/components/Chip.svelte";
  import Empty from "$lib/components/Empty.svelte";
  import Panel from "$lib/components/Panel.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Browser from "$lib/components/domain/Browser.svelte";
  import { me } from "$lib/identity.svelte";
  import { announce } from "$lib/notice.svelte";
  import { listRows } from "$lib/rows";

  const SAMPLE = 200;

  const DORMS = [
    "morewood",
    "etower",
    "whesco",
    "mcgillboss",
    "hammershlag",
    "donner",
    "stever",
    "mudge",
    "res",
  ];

  const LEVEL_TONES = {
    none: "bad",
    read: "neutral",
    edit: "warn",
    full: "good",
  } as const;

  const mayRead = $derived(me.allows("users", "read"));
  const level = $derived(me.level("users"));

  let total = $state(0);
  let loaded = $state(0);
  let dorms = $state<[string, number][]>([]);
  let fault = $state<string | null>(null);
  let counting = $state(true);

  async function tally(): Promise<void> {
    try {
      const sheet = await listRows("users", { limit: SAMPLE, order: "created_at", desc: true });
      const rows = sheet.rows as Record<string, unknown>[];
      const seen = new Map<string, number>();

      for (const row of rows) {
        const dorm = typeof row.dorm === "string" && row.dorm !== "" ? row.dorm : "no dorm set";
        seen.set(dorm, (seen.get(dorm) ?? 0) + 1);
      }

      total = sheet.total;
      loaded = rows.length;
      dorms = [...seen].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      fault = null;
    } catch (error) {
      fault = message(error);
      announce(fault, "bad", 12000);
    } finally {
      counting = false;
    }
  }

  $effect(() => {
    if (!mayRead) return;

    void tally();
  });
</script>

<header class="head">
  <h1>Users</h1>
  <p>
    Every account the app has created. Orientation staff correct Andrew IDs typed in wrong, set the
    dorm a student actually lives in, and flip leaderboard visibility when someone asks to be hidden.
  </p>
</header>

<div class="stack">
  <Panel
    title="Counts"
    detail="One total straight from the database, one breakdown of a sample"
  >
    {#if !mayRead}
      <Empty
        title="You cannot read users"
        detail="Ask a team lead to put you in the orientation-staff or trade-admin group."
      />
    {:else if counting}
      <Spinner label="Counting users" />
    {:else if fault !== null}
      <Empty title="Could not count users" detail={fault} />
    {:else}
      <div class="tally">
        <div class="figure">
          <p class="value">{total}</p>
          <p class="label">users in the table</p>
        </div>

        <div class="figure">
          <p class="value">{loaded}</p>
          <p class="label">rows loaded for the breakdown</p>
        </div>

        <div class="figure">
          <p class="value"><Chip tone={LEVEL_TONES[level]}>{level}</Chip></p>
          <p class="label">your level on users</p>
        </div>
      </div>

      <p class="caveat">
        The dorm breakdown below counts the {loaded} most recent rows this page loaded, capped at
        {SAMPLE}.
        {#if loaded < total}
          It is a sample, not a census: {total - loaded} of the {total} users in the table are
          missing from it, so these counts do not add up to the total and must never be quoted as
          one.
        {:else}
          That happens to be every row in the table right now, but it is still one page of at most
          {SAMPLE} rows: past {SAMPLE} users it silently becomes a sample, so read it as a page
          count rather than a total.
        {/if}
      </p>

      {#if dorms.length === 0}
        <Empty title="No rows to break down" detail="The users table is empty." />
      {:else}
        <ul class="dorms">
          {#each dorms as [dorm, count] (dorm)}
            <li>
              <span class="dorm">{dorm}</span>
              <span class="count">{count}</span>
            </li>
          {/each}
        </ul>
      {/if}

      {#if level === "edit"}
        <p class="note">
          Your groups grant <code>edit</code> on <code>users</code>, not <code>full</code>, so you
          can change a row but cannot create or delete one. That is deliberate: accounts are made by
          the app when a student signs in.
        </p>
      {/if}
    {/if}
  </Panel>

  <Browser
    table="users"
    title="Accounts"
    detail="Pick a row to correct it. Sort by clicking a column heading."
    group="orientation-staff or trade-admin"
    columns={["andrew_id", "dorm", "anonymous", "created_at", "id"]}
    searchHint="Andrew ID or dorm"
  >
    <p class="legend">
      <code>anonymous</code> set to true hides the account from the leaderboard. <code>dorm</code> is
      checked by the database, so it must be exactly one of these or empty:
    </p>

    <ul class="values">
      {#each DORMS as dorm (dorm)}
        <li><Chip>{dorm}</Chip></li>
      {/each}
    </ul>
  </Browser>
</div>

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

  .stack {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  .tally {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 32px;
  }

  .figure .value {
    margin: 0;
    font-size: 26px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }

  .figure .label {
    margin: 2px 0 0;
    color: var(--tertiary);
    font-size: 12px;
  }

  .caveat {
    margin: 18px 0 0;
    padding: 10px 14px;
    border-radius: var(--radius);
    background: var(--warn-fill);
    color: var(--warn);
    font-size: 12px;
    line-height: 1.6;
  }

  .dorms {
    display: grid;
    gap: 0 24px;
    margin: 14px 0 0;
    padding: 0;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    list-style: none;
  }

  .dorms li {
    display: flex;
    gap: 12px;
    align-items: baseline;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid var(--line);
  }

  .dorm {
    font-family: var(--mono);
    font-size: 12px;
  }

  .count {
    font-size: 13px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .note {
    margin: 16px 0 0;
    color: var(--tertiary);
    font-size: 12px;
    line-height: 1.6;
  }

  .legend {
    margin: 0;
    color: var(--tertiary);
    font-size: 12px;
    line-height: 1.6;
  }

  .values {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
  }

  code {
    color: var(--ink-shade);
    font-family: var(--mono);
    font-size: 11px;
  }
</style>
