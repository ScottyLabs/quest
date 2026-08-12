<script lang="ts">
  import { onMount } from "svelte";
  import PosterCard from "$lib/components/PosterCard.svelte";
  import { buildPdf, download, printPosters } from "$lib/pdf";
  import type { Progress } from "$lib/pdf";
  import { codeOk, PLACEHOLDERS, TEMPLATES } from "$lib/posters";
  import { posters } from "$lib/store.svelte";

  let filter = $state<string>("");
  let busy = $state(false);
  let progress = $state<Progress | null>(null);
  let failure = $state<string | null>(null);
  let dragging = $state(false);

  onMount(() => posters.restore());

  const shown = $derived(
    filter === "" ? posters.challenges : posters.challenges.filter((c) => c.category === filter),
  );
  const ready = $derived(posters.printable);
  const templateCount = $derived(Object.keys(TEMPLATES).length);

  async function read(file: File | null | undefined): Promise<void> {
    if (!file) return;
    failure = null;
    try {
      posters.ingest(await file.text());
    } catch (error) {
      failure = error instanceof Error ? error.message : "Could not read that file.";
    }
  }

  async function exportPdf(): Promise<void> {
    const sheets = ready.flatMap((challenge) => {
      const svg = posters.svgFor(challenge);
      return svg === null ? [] : [{ name: challenge.name, svg }];
    });

    busy = true;
    failure = null;
    progress = { done: 0, total: sheets.length };

    try {
      const blob = await buildPdf(sheets, (value) => (progress = value));
      download(blob, `quest-posters-${sheets.length}.pdf`);
    } catch (error) {
      failure = error instanceof Error ? error.message : "PDF export failed.";
    } finally {
      busy = false;
      progress = null;
    }
  }

  function print(): void {
    const sheets = ready.flatMap((challenge) => {
      const svg = posters.svgFor(challenge);
      return svg === null ? [] : [{ name: challenge.name, svg }];
    });
    printPosters(sheets);
  }
</script>

<svelte:head><title>Poster Generator - Orientation Quest</title></svelte:head>

<header>
  <div class="title">
    <h1>Poster Generator</h1>
    <p>Fill one SVG per category with challenge names and card codes, then print the lot as one PDF.</p>
  </div>
  <div class="actions">
    <button onclick={print} disabled={ready.length === 0 || busy}>Print</button>
    <button class="primary" onclick={exportPdf} disabled={ready.length === 0 || busy}>
      {busy ? "Building..." : `Download PDF (${ready.length})`}
    </button>
  </div>
</header>

{#if busy && progress !== null}
  <div class="progress" role="status">
    <div class="bar" style="width: {(progress.done / Math.max(progress.total, 1)) * 100}%"></div>
    <span>Rendering page {progress.done} of {progress.total}</span>
  </div>
{/if}

{#if failure !== null}
  <p class="failure" role="alert">{failure}</p>
{/if}

<main>
  <aside>
    <section>
      <h2>1. Challenge list</h2>
      <div
        class="drop"
        class:dragging
        ondragover={(event) => {
          event.preventDefault();
          dragging = true;
        }}
        ondragleave={() => (dragging = false)}
        ondrop={(event) => {
          event.preventDefault();
          dragging = false;
          void read(event.dataTransfer?.files?.[0]);
        }}
        role="presentation"
      >
        <p>Drop a CSV here</p>
        <label class="file">
          <input
            type="file"
            accept=".csv,text/csv"
            onchange={(event) => void read(event.currentTarget.files?.[0])}
          />
          <span>Choose file</span>
        </label>
        <button class="link" onclick={loadSample}>or load newquest.csv</button>
      </div>

      {#if posters.rowCount > 0}
        <p class="note">{posters.rowCount} rows &middot; {posters.categories.length} categories</p>

        <div class="mapping">
          {#each [["category", "Category"], ["name", "Name"], ["code", "Code"]] as const as [kind, label] (kind)}
            <label>
              {label}
              <select
                value={posters.columns[kind] ?? ""}
                onchange={(event) => posters.setColumn(kind, event.currentTarget.value)}
              >
                <option value="">— none —</option>
                {#each posters.headers as header (header)}
                  <option value={header}>{header}</option>
                {/each}
              </select>
            </label>
          {/each}
        </div>
      {/if}
    </section>

    <section>
      <h2>2. Templates</h2>
      <p class="note">
        {templateCount} SVG{templateCount === 1 ? "" : "s"} in <code>src/lib/templates/</code>, named
        after the slugified category. Placeholders:
      </p>
      <p class="tokens">
        {#each PLACEHOLDERS as token (token)}<code>{"{{"}{token}{"}}"}</code>{/each}
      </p>

      {#if posters.missingTemplates.length > 0}
        <ul class="missing">
          {#each posters.missingTemplates as entry (entry.slug)}
            <li>
              <strong>{entry.category}</strong> needs
              <code>{entry.slug}.svg</code> ({entry.count})
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <h2>3. Card codes</h2>
      <p class="note">Four characters, <code>0-9</code> and <code>A-Z</code>. Read from the sheet's Code column when present.</p>
      <div class="row">
        <button onclick={() => posters.autoAssign()} disabled={posters.rowCount === 0}>
          Auto-assign empty
        </button>
        <button onclick={() => posters.clearCodes()} disabled={posters.rowCount === 0}>Clear</button>
      </div>
      <p class="note">
        <strong>{ready.length}</strong> ready &middot;
        <strong>{posters.blocked.length}</strong> incomplete
      </p>
    </section>
  </aside>

  <section class="sheet">
    {#if posters.challenges.length === 0}
      <p class="empty">Load a CSV to begin.</p>
    {:else}
      <div class="chips">
        <button class:active={filter === ""} onclick={() => (filter = "")}>
          All ({posters.challenges.length})
        </button>
        {#each posters.categories as entry (entry.slug)}
          <button
            class:active={filter === entry.category}
            class:absent={!entry.hasTemplate}
            onclick={() => (filter = entry.category)}
          >
            {entry.category} ({entry.count})
          </button>
        {/each}
      </div>

      <table>
        <thead>
          <tr><th>Print</th><th>Challenge</th><th>Code</th><th>Template</th></tr>
        </thead>
        <tbody>
          {#each shown as challenge (challenge.key)}
            <tr class:skipped={posters.excluded(challenge.key)}>
              <td>
                <input
                  type="checkbox"
                  checked={!posters.excluded(challenge.key)}
                  onchange={() => posters.toggle(challenge.key)}
                  aria-label="Include {challenge.name}"
                />
              </td>
              <td class="cell-name">{challenge.name}</td>
              <td>
                <input
                  type="text"
                  class="code"
                  class:bad={challenge.code !== "" && !codeOk(challenge.code)}
                  value={challenge.code}
                  maxlength="4"
                  placeholder="0000"
                  spellcheck="false"
                  oninput={(event) => posters.setCode(challenge.key, event.currentTarget.value)}
                />
              </td>
              <td class="cell-slug">
                {#if challenge.hasTemplate}
                  <code>{challenge.slug}</code>
                {:else}
                  <span class="warn">missing</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <h2 class="preview-title">Preview</h2>
      <div class="grid">
        {#each shown as challenge (challenge.key)}
          <PosterCard
            svg={posters.svgFor(challenge)}
            name={challenge.name}
            code={challenge.code}
            category={challenge.category}
          />
        {/each}
      </div>
    {/if}
  </section>
</main>

<style>
  header {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem clamp(1rem, 3vw, 2rem);
    background: var(--surface);
    border-bottom: 1px solid var(--line);
  }

  .title h1 {
    font-size: 1.35rem;
  }

  .title p {
    margin: 0.25rem 0 0;
    color: var(--ink-soft);
    font-size: 0.9rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .progress {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem clamp(1rem, 3vw, 2rem);
    background: #fff8f9;
    border-bottom: 1px solid var(--line);
    font-size: 0.85rem;
    color: var(--ink-soft);
  }

  .bar {
    position: absolute;
    inset: 0 auto 0 0;
    background: rgb(196 18 48 / 0.12);
    transition: width 120ms linear;
  }

  .progress span {
    position: relative;
  }

  .failure {
    margin: 0;
    padding: 0.6rem clamp(1rem, 3vw, 2rem);
    background: #fdf1f3;
    color: var(--tartan-dark);
    font-size: 0.9rem;
  }

  main {
    display: grid;
    grid-template-columns: minmax(260px, 320px) 1fr;
    gap: clamp(1rem, 2vw, 1.75rem);
    align-items: start;
    padding: clamp(1rem, 3vw, 2rem);
  }

  @media (max-width: 900px) {
    main {
      grid-template-columns: 1fr;
    }
  }

  aside {
    position: sticky;
    top: clamp(1rem, 3vw, 2rem);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  section {
    padding: 1rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }

  h2 {
    font-size: 0.95rem;
  }

  .note {
    margin: 0.5rem 0 0;
    color: var(--ink-soft);
    font-size: 0.82rem;
    line-height: 1.5;
  }

  .drop {
    margin-top: 0.75rem;
    display: grid;
    gap: 0.5rem;
    justify-items: center;
    padding: 1rem;
    border: 1.5px dashed var(--line);
    border-radius: var(--radius);
    background: var(--canvas);
    text-align: center;
  }

  .drop.dragging {
    border-color: var(--tartan);
    background: #fff8f9;
  }

  .drop p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--ink-soft);
  }

  .file input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  .file span {
    display: inline-block;
    padding: 0.45rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    font-size: 0.85rem;
    cursor: pointer;
  }

  button.link {
    border: 0;
    background: none;
    padding: 0;
    color: var(--ink-soft);
    font-size: 0.8rem;
    text-decoration: underline;
  }

  .mapping {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .mapping label {
    display: grid;
    gap: 0.2rem;
    font-size: 0.8rem;
    color: var(--ink-soft);
  }

  .tokens {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin: 0.5rem 0 0;
  }

  .tokens code {
    padding: 0.1rem 0.3rem;
    background: var(--canvas);
    border-radius: 5px;
  }

  .missing {
    margin: 0.6rem 0 0;
    padding-left: 1.1rem;
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--warn);
  }

  .row {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .sheet {
    min-width: 0;
  }

  .empty {
    margin: 0;
    color: var(--ink-soft);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .chips button {
    border-radius: 999px;
    font-size: 0.82rem;
    padding: 0.35rem 0.75rem;
  }

  .chips button.active {
    border-color: var(--tartan);
    background: #fff8f9;
    color: var(--tartan-dark);
    font-weight: 600;
  }

  .chips button.absent {
    color: var(--warn);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  th {
    text-align: left;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-soft);
    padding: 0 0.5rem 0.4rem;
  }

  td {
    padding: 0.3rem 0.5rem;
    border-top: 1px solid var(--line);
  }

  tr.skipped .cell-name {
    color: var(--ink-soft);
    text-decoration: line-through;
  }

  .cell-name {
    max-width: 28rem;
  }

  .code {
    width: 5.5rem;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    text-transform: uppercase;
  }

  .code.bad {
    border-color: var(--tartan);
    background: #fdf1f3;
  }

  .warn {
    color: var(--warn);
  }

  .preview-title {
    margin: 1.5rem 0 0.75rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 1rem;
  }
</style>
