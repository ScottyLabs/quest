<script lang="ts">
  import { replaceState } from "$app/navigation";
  import { page } from "$app/state";

  import { api, message, unwrap, type TableView } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import RowBrowser from "$lib/components/data/RowBrowser.svelte";
  import TablePicker from "$lib/components/data/TablePicker.svelte";
  import Empty from "$lib/components/Empty.svelte";
  import Panel from "$lib/components/Panel.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { me } from "$lib/identity.svelte";
  import { announce } from "$lib/notice.svelte";

  let tables = $state<TableView[]>([]);
  let loading = $state(true);
  let failure = $state<string | null>(null);
  let reloading = $state(false);
  let chosen = $state<string | null>(null);
  let adopted: string | null = null;
  let flagged: string | null = null;
  let reverseOrder = $state(false);

  const asked = $derived(page.url.searchParams.get("table"));

  const selected = $derived(
    tables.find((table) => table.name === chosen) ?? null,
  );

  $effect(() => {
    void fetchTables(true);
  });

  $effect(() => {
    const name = asked;

    if (name === adopted) return;

    adopted = name;
    chosen = name === "" ? null : name;
  });

  $effect(() => {
    if (
      loading ||
      chosen === null ||
      selected !== null ||
      flagged === chosen
    ) {
      return;
    }

    flagged = chosen;

    announce(
      `You cannot reach a table called ${chosen}.`,
      "bad",
    );
  });

  async function fetchTables(initial: boolean): Promise<void> {
    if (initial) loading = true;

    try {
      tables = await unwrap(
        await api.GET("/api/portal/tables"),
      );

      failure = null;
    } catch (error) {
      failure = message(error);

      announce(
        failure,
        "bad",
        12000,
      );
    } finally {
      if (initial) loading = false;
    }
  }

  function choose(name: string): void {
    chosen = name;
    adopted = name;

    const url = new URL(page.url);

    url.searchParams.set("table", name);

    replaceState(url, page.state);
  }

  async function reloadSchema(): Promise<void> {
    reloading = true;

    try {
      const reloaded = await unwrap(
        await api.POST(
          "/api/portal/catalog/reload",
          {},
        ),
      );

      await fetchTables(false);

      announce(
        `Schema reloaded: ${reloaded.tables} tables in the catalog, ${tables.length} within your reach.`,
        "good",
      );
    } catch (error) {
      announce(
        message(error),
        "bad",
        12000,
      );
    } finally {
      reloading = false;
    }
  }
</script>

<header class="head">
  <h1>Data console</h1>

  <p>
    Every table your roles reach, row by row. Edits go straight to Postgres
    through the same permission checks the app uses, so a wrong value here is
    a wrong value in the game. Coin values and item costs feed derived
    balances - changing one rewrites what everybody already earned.
  </p>
</header>

<div class="split">
  <Panel
    title="Tables"
    detail="Pick one to browse its rows"
  >
    {#if loading}
      <div class="wait">
        <Spinner label="Loading tables" />
      </div>
    {:else if tables.length === 0}
      <Empty
        title="No tables"
        detail={failure ?? "Your roles do not grant you a single table."}
      />
    {:else}
      <TablePicker
        {tables}
        selected={chosen}
        onpick={choose}
      />
    {/if}
  </Panel>

  <div class="browser">
    {#if loading}
      <Panel>
        <div class="wait">
          <Spinner label="Loading tables" />
        </div>
      </Panel>
    {:else if failure !== null && tables.length === 0}
      <Panel>
        <Empty
          title="Could not load the table list"
          detail={failure}
        />
      </Panel>
    {:else if selected !== null}
      {#key selected.name}
        <RowBrowser
          table={selected}
          {reverseOrder}
        >
          {#snippet extras()}
            <Button
              tone="line"
              size="small"
              onclick={() => {
                reverseOrder = !reverseOrder;
              }}
            >
              {reverseOrder ? "Oldest first" : "Newest first"}
            </Button>

            {#if me.can("data_console")}
              <Button
                tone="line"
                size="small"
                busy={reloading}
                onclick={reloadSchema}
              >
                Reload schema
              </Button>
            {/if}
          {/snippet}
        </RowBrowser>
      {/key}
    {:else if chosen !== null}
      <Panel>
        <Empty
          title="That table is not yours"
          detail={`Nothing named ${chosen} is in your grant list. Pick one from the left.`}
        />
      </Panel>
    {:else}
      <Panel>
        <Empty
          title="Pick a table"
          detail="Choose a table on the left to search, sort, page through and edit its rows."
        />
      </Panel>
    {/if}
  </div>
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

  .split {
    display: grid;
    gap: 20px;
    align-items: start;
    grid-template-columns: 17rem minmax(0, 1fr);
  }

  .browser {
    min-width: 0;
  }

  .wait {
    display: flex;
    justify-content: center;
    padding: 24px 0;
  }

  @media (max-width: 60rem) {
    .split {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>