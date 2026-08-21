<script lang="ts">
  import { api, message, unwrap, type Schemas } from "$lib/api/client";
  import Empty from "$lib/components/Empty.svelte";
  import { me } from "$lib/identity.svelte";

  type ActivityDay = Schemas["ActivityDay"];
  type ActivityTap = Schemas["ActivityTap"];

  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const allowed = $derived(
    me.can("data_console") &&
      me.allows("users", "read") &&
      me.allows("tap_events", "read") &&
      me.allows("challenge", "read") &&
      me.allows("daily_challenge", "read"),
  );

  const canEditTaps = $derived(me.allows("tap_events", "edit"));

  let andrew = $state("");
  let viewed = $state("");
  let activity = $state<ActivityDay[]>([]);
  let taps = $state<ActivityTap[]>([]);
  let selected = $state<number[]>([]);
  let targetDay = $state("");

  let loading = $state(false);
  let moving = $state(false);
  let fault = $state<string | null>(null);
  let notice = $state<string | null>(null);

  const totalTaps = $derived(
    activity.reduce((total, day) => total + day.taps, 0),
  );

  const totalEligible = $derived(
    activity.reduce((total, day) => total + day.eligible_taps, 0),
  );

  const totalGemstones = $derived(
    activity.reduce((total, day) => total + day.gemstones, 0),
  );

  function formatDay(day: string): string {
    const [year, month, date] = day.split("-").map(Number);

    if (
      year === undefined ||
      month === undefined ||
      date === undefined ||
      MONTHS[month - 1] === undefined
    ) {
      return day;
    }

    return `${MONTHS[month - 1]} ${date}, ${year}`;
  }

  async function load(): Promise<void> {
    const wanted = andrew.trim().toLowerCase();

    if (wanted === "") {
      activity = [];
      taps = [];
      viewed = "";
      selected = [];
      fault = "Enter an Andrew ID.";
      return;
    }

    loading = true;
    fault = null;
    notice = null;

    try {
      const [days, history] = await Promise.all([
        unwrap(
          await api.GET("/api/portal/activity/{andrew_id}", {
            params: {
              path: {
                andrew_id: wanted,
              },
            },
          }),
        ),
        unwrap(
          await api.GET("/api/portal/activity/{andrew_id}/taps", {
            params: {
              path: {
                andrew_id: wanted,
              },
            },
          }),
        ),
      ]);

      activity = days;
      taps = history;
      viewed = wanted;
      selected = [];
    } catch (error) {
      activity = [];
      taps = [];
      viewed = "";
      selected = [];
      fault = message(error);
    } finally {
      loading = false;
    }
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    void load();
  }

  async function moveSelected(): Promise<void> {
    if (
      !canEditTaps ||
      selected.length === 0 ||
      targetDay === "" ||
      viewed === ""
    ) {
      return;
    }

    const accepted = window.confirm(
      `Move ${selected.length} selected tap(s) to Quest day ${targetDay}?`,
    );

    if (!accepted) {
      return;
    }

    moving = true;
    fault = null;
    notice = null;

    try {
      const result = await unwrap(
        await api.PATCH(
          "/api/portal/activity/{andrew_id}/taps/day",
          {
            params: {
              path: {
                andrew_id: viewed,
              },
            },
            body: {
              tap_ids: selected,
              day: targetDay,
            },
          },
        ),
      );

      const moved = result.moved;

      await load();

      notice = `Moved ${moved} tap${moved === 1 ? "" : "s"}.`;
    } catch (error) {
      fault = message(error);
    } finally {
      moving = false;
    }
  }
</script>

<header class="head">
  <h1>Daily Activity</h1>
  <p>
    View successful taps and dynamically calculated gemstone earnings by
    Quest day. Quest days run from noon to noon Eastern time.
  </p>
</header>

{#if !allowed}
  <Empty
    title="Activity is unavailable"
    detail="You need read access to users, tap events, challenges, and daily challenges."
  />
{:else}
  <form class="search" onsubmit={submit}>
    <label>
      <span>Andrew ID</span>
      <input
        type="text"
        autocomplete="off"
        placeholder="andrew"
        bind:value={andrew}
      />
    </label>

    <button type="submit" disabled={loading}>
      {loading ? "Loading..." : "View activity"}
    </button>
  </form>

  {#if fault !== null}
    <p class="fault">{fault}</p>
  {/if}

  {#if notice !== null}
    <p class="notice">{notice}</p>
  {/if}

  {#if viewed !== ""}
    <section class="summary">
      <div>
        <span>Student</span>
        <strong>{viewed}</strong>
      </div>

      <div>
        <span>Successful taps</span>
        <strong>{totalTaps}</strong>
      </div>

      <div>
        <span>Gem-eligible taps</span>
        <strong>{totalEligible}</strong>
      </div>

      <div>
        <span>Gemstones earned</span>
        <strong>{totalGemstones}</strong>
      </div>
    </section>

    <p class="explain">
      Gem-eligible taps exclude secret challenges. Gemstones use the same
      calculation as the app, including the daily cap and daily-challenge
      bonus.
    </p>

    <h2>Daily totals</h2>

    {#if activity.length === 0}
      <Empty
        title="No activity found"
        detail={`${viewed} has no successful tap activity.`}
      />
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Quest day</th>
              <th>Successful taps</th>
              <th>Gem-eligible taps</th>
              <th>Gemstones earned</th>
            </tr>
          </thead>

          <tbody>
            {#each activity as day (day.day)}
              <tr>
                <td>{formatDay(day.day)}</td>
                <td>{day.taps}</td>
                <td>{day.eligible_taps}</td>
                <td>{day.gemstones}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    <div class="tap-head">
      <div>
        <h2>Tap history</h2>
        <p>
          Times below are Eastern time. The Quest day column uses the
          noon-to-noon gemstone boundary.
        </p>
      </div>

      <strong>{taps.length} taps</strong>
    </div>

    {#if canEditTaps && taps.length > 0}
      <section class="move">
        <div>
          <strong>Move taps to another Quest day</strong>
          <p>
            Select taps below, choose the Quest day they should count toward,
            and move them together. Their time within the Quest day is
            preserved.
          </p>
        </div>

        <label>
          <span>Target Quest day</span>
          <input type="date" bind:value={targetDay} />
        </label>

        <button
          type="button"
          disabled={moving || selected.length === 0 || targetDay === ""}
          onclick={moveSelected}
        >
          {moving
            ? "Moving..."
            : `Move selected (${selected.length})`}
        </button>
      </section>

      <p class="warning">
        Moving a tap changes gemstone accounting. Moving a daily-challenge tap
        can also add or remove its daily bonus.
      </p>
    {/if}

    {#if taps.length > 0}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              {#if canEditTaps}
                <th>Select</th>
              {/if}
              <th>Eastern time</th>
              <th>Quest day</th>
              <th>Challenge</th>
              <th>Gem eligible</th>
              <th>Daily bonus</th>
            </tr>
          </thead>

          <tbody>
            {#each taps as tap (tap.id)}
              <tr>
                {#if canEditTaps}
                  <td>
                    <input
                      type="checkbox"
                      value={tap.id}
                      bind:group={selected}
                      aria-label={`Select ${tap.challenge}`}
                    />
                  </td>
                {/if}

                <td>{tap.local_time}</td>
                <td>{formatDay(tap.day)}</td>
                <td>{tap.challenge}</td>
                <td>{tap.gem_eligible ? "Yes" : "No"}</td>
                <td>{tap.daily_bonus ? "Yes" : "No"}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
{/if}

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

  h2 {
    margin: 24px 0 10px;
    font-size: 18px;
    font-weight: 800;
  }

  .head p,
  .explain,
  .tap-head p,
  .move p,
  .warning {
    margin: 0;
    color: var(--tertiary);
    font-size: 13px;
    line-height: 1.6;
  }

  .search {
    display: flex;
    align-items: end;
    gap: 10px;
    max-width: 520px;
    margin-bottom: 18px;
  }

  label {
    display: grid;
    flex: 1;
    gap: 6px;
  }

  label span {
    color: var(--tertiary);
    font-size: 12px;
    font-weight: 700;
  }

  input {
    width: 100%;
    min-width: 0;
  }

  button {
    white-space: nowrap;
  }

  .fault {
    margin: 12px 0;
    color: var(--bad);
    font-size: 13px;
    font-weight: 600;
  }

  .notice {
    margin: 12px 0;
    font-size: 13px;
    font-weight: 700;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin: 0 0 12px;
  }

  .summary div {
    display: grid;
    gap: 4px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--highlight);
    box-shadow: var(--lift);
  }

  .summary span {
    color: var(--tertiary);
    font-size: 11px;
    font-weight: 700;
  }

  .summary strong {
    color: var(--ink);
    font-size: 20px;
    font-weight: 800;
  }

  .explain {
    margin-bottom: 16px;
  }

  .tap-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
    margin-top: 30px;
    margin-bottom: 10px;
  }

  .tap-head h2 {
    margin: 0 0 4px;
  }

  .move {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 180px auto;
    align-items: end;
    gap: 12px;
    margin: 14px 0 8px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--highlight);
  }

  .warning {
    margin-bottom: 12px;
  }

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--highlight);
    box-shadow: var(--lift);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 11px 14px;
    text-align: left;
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
  }

  th {
    color: var(--tertiary);
    font-size: 11px;
    font-weight: 800;
  }

  td {
    font-size: 13px;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  @media (max-width: 720px) {
    .summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .search,
    .move {
      align-items: stretch;
      grid-template-columns: 1fr;
      flex-direction: column;
    }
  }
</style>