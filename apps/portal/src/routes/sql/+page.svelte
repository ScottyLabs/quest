<script lang="ts">
  import type { Outcome, Script } from "$lib/api/client";
  import { api, message, unwrap } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Chip from "$lib/components/Chip.svelte";
  import Empty from "$lib/components/Empty.svelte";
  import Field from "$lib/components/Field.svelte";
  import Panel from "$lib/components/Panel.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import History from "$lib/components/sql/History.svelte";
  import Results from "$lib/components/sql/Results.svelte";
  import ScriptRun from "$lib/components/sql/ScriptRun.svelte";
  import Snippets from "$lib/components/sql/Snippets.svelte";
  import { me } from "$lib/identity.svelte";
  import { announce } from "$lib/notice.svelte";

  const STORE = "quest.portal.sql";
  const KEPT = 15;
  const SCRIPT_LIMIT = 1024 * 1024;

  let text = $state("");
  let write = $state(false);
  let busy = $state(false);
  let outcome = $state<Outcome | null>(null);
  let script = $state<Script | null>(null);
  let failure = $state<string | null>(null);
  let confirming = $state(false);
  let confirmed = $state(false);
  let past = $state<string[]>(remembered());
  let loaded = $state<string | null>(null);
  let dragging = $state(false);
  let pending = $state<{ name: string; body: string } | null>(null);
  let field = $state<HTMLInputElement | null>(null);

  const allowed = $derived(me.can("sql_console"));
  const statements = $derived(count(text));
  const multiple = $derived(statements > 1);

  function count(source: string): number {
    let total = 0;
    let quote: string | null = null;

    for (let at = 0; at < source.length; at += 1) {
      const here = source[at];

      if (quote !== null) {
        if (here === quote) quote = null;
        continue;
      }

      if (here === "'" || here === '"') {
        quote = here;
        continue;
      }

      if (here === "-" && source[at + 1] === "-") {
        while (at < source.length && source[at] !== "\n") at += 1;
        continue;
      }

      if (here === ";") total += 1;
    }

    const tail = source.slice(source.lastIndexOf(";") + 1).trim();

    return total + (tail === "" ? 0 : 1);
  }

  function remembered(): string[] {
    try {
      const raw = localStorage.getItem(STORE);

      if (raw === null) return [];

      const parsed: unknown = JSON.parse(raw);

      if (!Array.isArray(parsed)) return [];

      return parsed.filter((entry): entry is string => typeof entry === "string").slice(0, KEPT);
    } catch {
      return [];
    }
  }

  function keep(entries: string[]): void {
    past = entries;

    try {
      localStorage.setItem(STORE, JSON.stringify(entries));
    } catch {
      announce("Could not save the history in this browser.", "bad");
    }
  }

  function record(sql: string): void {
    if (past[0] === sql) return;

    keep([sql, ...past].slice(0, KEPT));
  }

  function forget(): void {
    keep([]);
    announce("History cleared.");
  }

  function load(sql: string): void {
    text = sql;
    confirming = false;
    loaded = null;
  }

  function clear(): void {
    text = "";
    confirming = false;
    loaded = null;
  }

  function toggled(): void {
    confirming = false;
  }

  function adopt(name: string, body: string): void {
    text = body;
    loaded = name;
    confirming = false;
    pending = null;
    announce(`Loaded ${name}: ${count(body)} statements.`, "good");
  }

  async function take(file: File): Promise<void> {
    if (file.size > SCRIPT_LIMIT) {
      announce(`${file.name} is larger than the 1 MB script limit.`, "bad");
      return;
    }

    const body = await file.text();

    if (text.trim() === "") {
      adopt(file.name, body);
      return;
    }

    pending = { name: file.name, body };
  }

  async function picked(event: Event & { currentTarget: HTMLInputElement }): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (file !== undefined) await take(file);
    input.value = "";
  }

  async function dropped(event: DragEvent): Promise<void> {
    event.preventDefault();
    dragging = false;

    const file = event.dataTransfer?.files?.[0];

    if (file !== undefined) await take(file);
  }

  async function runScript(): Promise<void> {
    const sql = text.trim();

    if (sql === "") {
      announce("Load or write a script first.", "bad");
      return;
    }

    if (write && !confirmed && !confirming) {
      confirming = true;
      return;
    }

    confirming = false;
    busy = true;

    try {
      const done = unwrap(await api.POST("/api/portal/sql/script", { body: { sql, write } }));

      script = done;
      outcome = null;
      failure = null;
      if (write) confirmed = true;
      record(sql);

      if (done.committed) {
        announce(
          write
            ? `Committed ${done.statements} statements in ${done.elapsed_ms} ms.`
            : `Dry run: ${done.statements} statements ran read only in ${done.elapsed_ms} ms.`,
          "good",
        );
      } else {
        announce(
          `Rolled back at statement ${(done.failed ?? 0) + 1} of ${done.statements}.`,
          "bad",
          12000,
        );
      }
    } catch (error) {
      failure = message(error);
      script = null;
      announce(failure, "bad");
    } finally {
      busy = false;
    }
  }

  async function run(): Promise<void> {
    const sql = text.trim();

    if (sql === "") {
      announce("Write a statement first.", "bad");
      return;
    }

    if (write && !confirmed && !confirming) {
      confirming = true;
      return;
    }

    confirming = false;
    busy = true;

    try {
      const done = unwrap(await api.POST("/api/portal/sql", { body: { sql, write } }));
      const noun = done.rows_affected === 1 ? "row" : "rows";

      outcome = done;
      script = null;
      failure = null;
      if (write) confirmed = true;
      record(sql);
      announce(`${done.rows_affected} ${noun} in ${done.elapsed_ms} ms`, "good");
    } catch (error) {
      failure = message(error);
      announce(failure, "bad");
    } finally {
      busy = false;
    }
  }

  function typed(event: KeyboardEvent): void {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;

    event.preventDefault();
    if (multiple) void runScript();
    else void run();
  }

  async function copyJson(): Promise<void> {
    if (outcome === null) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(outcome.rows, null, 2));
      announce("Rows copied as JSON.", "good");
    } catch {
      announce("The browser refused clipboard access.", "bad");
    }
  }
</script>

<header class="head">
  <h1>SQL console</h1>
  <p>
    Run one statement, or upload a whole <code>.psql</code> script and run it as a single
    transaction, with a 15 second timeout per statement and a 2000 row cap. The write switch is the
    only thing standing between a SELECT and a change nobody asked for.
  </p>
</header>

{#if !allowed}
  <Empty
    title="SQL console is for team leads"
    detail="Your Keycloak groups don't carry the sql_console capability. Ask a team lead if you need it."
  />
{:else}
  <div class="layout">
    <div class="main">
      <Panel title="Statement" detail="Ctrl or Cmd plus Enter runs it">
        {#snippet actions()}
          <Chip tone={statements > 1 ? "accent" : "neutral"}>
            {statements}
            {statements === 1 ? "statement" : "statements"}
          </Chip>
          <Button tone="line" size="small" onclick={() => field?.click()}>Upload .psql</Button>
        {/snippet}

        <input
          bind:this={field}
          class="file"
          type="file"
          accept=".psql,.sql,text/plain,application/sql"
          onchange={(event) => void picked(event)}
        />

        {#if loaded !== null}
          <p class="loaded">
            Loaded from <b>{loaded}</b> &mdash; {statements}
            {statements === 1 ? "statement" : "statements"}.
          </p>
        {/if}

        {#if pending !== null}
          <div class="pending" role="alert">
            <p>
              Replace what is in the editor with <b>{pending.name}</b>? The current statement is not
              saved anywhere.
            </p>
            <div class="acts">
              <Button
                size="small"
                onclick={() => pending !== null && adopt(pending.name, pending.body)}
              >
                Replace
              </Button>
              <Button tone="ghost" size="small" onclick={() => (pending = null)}>Keep mine</Button>
            </div>
          </div>
        {/if}

        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="editor"
          class:dragging
          ondragover={(event) => {
            event.preventDefault();
            dragging = true;
          }}
          ondragleave={() => (dragging = false)}
          ondrop={(event) => void dropped(event)}
        >
          <Field label="SQL" hint="one statement, or a script separated by semicolons">
            <textarea
              bind:value={text}
              spellcheck="false"
              autocapitalize="off"
              placeholder="SELECT andrew_id, dorm FROM users ORDER BY created_at DESC LIMIT 20"
              onkeydown={typed}
            ></textarea>
          </Field>

          {#if dragging}
            <p class="hint">Drop the .psql file to load it</p>
          {/if}
        </div>
        <div class="run" class:armed={write}>
          <label class="switch">
            <input type="checkbox" bind:checked={write} onchange={toggled} />
            <span class="track" aria-hidden="true"><span class="knob"></span></span>
            <span class="copy">
              <span class="name">{write ? "Write mode" : "Read only"}</span>
              <span class="note">
                {#if write}
                  Statements commit. Changing challenge.coin_value or items.cost moves every balance
                  retroactively.
                {:else}
                  Everything runs inside a Postgres READ ONLY transaction, so a write fails instead
                  of landing. For a script that makes this a dry run.
                {/if}
              </span>
            </span>
          </label>

          <div class="acts">
            {#if confirming}
              <span class="confirm">Click again to run a write</span>
            {/if}

            <Button tone="ghost" onclick={clear} disabled={busy}>Clear</Button>

            <Button
              tone={multiple ? (write ? "danger" : "solid") : "line"}
              {busy}
              onclick={() => void runScript()}
            >
              {write ? "Run script" : "Dry run script"}
            </Button>

            <Button
              tone={multiple ? "line" : write ? "danger" : "solid"}
              {busy}
              disabled={multiple}
              title={multiple
                ? `Run sends one statement at a time; this is ${statements}. Use Run script.`
                : undefined}
              onclick={() => void run()}
            >
              {confirming ? "Confirm write" : write ? "Run write" : "Run"}
            </Button>
          </div>
        </div>
      </Panel>

      {#if failure !== null}
        <div class="failed" role="alert">
          <p class="tag">Postgres rejected the statement</p>
          <pre>{failure}</pre>
        </div>
      {/if}

      <Panel title={script === null ? "Results" : "Script"} flush>
        {#snippet actions()}
          {#if script !== null}
            <Chip tone={script.committed ? "good" : "bad"}>
              {script.committed ? (script.read_only ? "dry run" : "committed") : "rolled back"}
            </Chip>
          {:else if outcome !== null && outcome.columns.length > 0}
            <Button tone="line" size="small" onclick={() => void copyJson()}>Copy as JSON</Button>
          {/if}
        {/snippet}

        {#if busy}
          <Spinner label="Running" />
        {:else if script !== null}
          <ScriptRun {script} />
        {:else if outcome === null}
          <Empty
            title="Nothing has run yet"
            detail="Type a statement, pick a snippet, or upload a .psql script."
          />
        {:else}
          <Results {outcome} />
        {/if}
      </Panel>
    </div>

    <aside class="side">
      <History items={past} onpick={load} onclear={forget} />
      <Snippets onpick={load} />
    </aside>
  </div>
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

  .head p {
    margin: 0;
    color: var(--tertiary);
    font-size: 13px;
    line-height: 1.6;
  }

  .layout {
    display: grid;
    gap: 20px;
    align-items: start;
    grid-template-columns: minmax(0, 1fr) 18rem;
  }

  .main,
  .side {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  .file {
    display: none;
  }

  .loaded {
    margin: 0 0 12px;
    color: var(--tertiary);
    font-size: 12px;
  }

  .pending {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 14px;
    padding: 10px 14px;
    border: 1px solid var(--warn);
    border-radius: var(--radius);
    background: var(--warn-fill);
  }

  .pending p {
    margin: 0;
    color: var(--warn);
    font-size: 12px;
    font-weight: 600;
  }

  .pending .acts {
    display: flex;
    flex: none;
    gap: 6px;
  }

  .editor {
    position: relative;
    border-radius: var(--radius);
  }

  .editor.dragging {
    outline: 2px dashed var(--accent);
    outline-offset: 4px;
  }

  .editor .hint {
    position: absolute;
    inset: auto 0 8px;
    margin: 0;
    color: var(--accent);
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    pointer-events: none;
  }

  .editor textarea {
    min-height: 11rem;
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.6;
    tab-size: 2;
    resize: vertical;
  }

  .run {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin: 14px 0 0;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--tertiary-normal);
  }

  .run.armed {
    border-color: var(--danger);
    background: var(--highlight);
    box-shadow: inset 4px 0 0 var(--danger);
  }

  .switch {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    min-width: 0;
    cursor: pointer;
  }

  .switch input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  .track {
    display: flex;
    flex: none;
    align-items: center;
    width: 38px;
    height: 22px;
    margin: 1px 0 0;
    padding: 3px;
    border-radius: var(--radius-pill);
    background: var(--muted);
    transition: background 0.15s ease;
  }

  .knob {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--highlight);
    box-shadow: var(--lift);
    transition: transform 0.15s ease;
  }

  .switch input:checked + .track {
    background: var(--danger);
  }

  .switch input:checked + .track .knob {
    transform: translateX(16px);
  }

  .switch input:focus-visible + .track {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .name {
    color: var(--secondary);
    font-size: 13px;
    font-weight: 800;
  }

  .run.armed .name {
    color: var(--danger);
  }

  .note {
    max-width: 34rem;
    color: var(--tertiary);
    font-size: 12px;
    line-height: 1.5;
  }

  .acts {
    display: flex;
    flex: none;
    gap: 8px;
    align-items: center;
  }

  .confirm {
    color: var(--danger);
    font-size: 12px;
    font-weight: 700;
  }

  .failed {
    padding: 14px 16px;
    border: 1px solid var(--danger);
    border-radius: var(--radius-lg);
    background: var(--danger-fill);
  }

  .tag {
    margin: 0 0 6px;
    color: var(--danger);
    font-size: 12px;
    font-weight: 800;
  }

  pre {
    margin: 0;
    overflow-x: auto;
    color: var(--secondary);
    font-family: var(--mono);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  @media (max-width: 72rem) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
