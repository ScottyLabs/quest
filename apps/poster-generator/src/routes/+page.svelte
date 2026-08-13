<script lang="ts">
  import { onMount } from "svelte";
  import PosterCard from "$lib/components/PosterCard.svelte";
  import { buildPdf, download, printPosters } from "$lib/pdf";
  import type { Progress } from "$lib/pdf";
  import { codeOk, PLACEHOLDERS, TEMPLATES, tintFor } from "$lib/posters";
  import { posters } from "$lib/store.svelte";

  let filter = $state<string>("");
  let query = $state("");
  let onlyOpen = $state(false);
  let view = $state<"grid" | "list">("grid");
  let busy = $state(false);
  let progress = $state<Progress | null>(null);
  let failure = $state<string | null>(null);
  let dragging = $state(false);

  onMount(() => {
    posters.restore();
    void posters.ready();
  });

  const shown = $derived(
    posters.challenges.filter((challenge) => {
      if (filter !== "" && challenge.category !== filter) return false;
      if (onlyOpen && challenge.hasTemplate && codeOk(challenge.code)) return false;
      if (query === "") return true;
      const needle = query.toLowerCase();
      return (
        challenge.name.toLowerCase().includes(needle) ||
        challenge.code.toLowerCase().includes(needle)
      );
    }),
  );

  const ready = $derived(posters.printable);
  const total = $derived(posters.challenges.length);
  const pace = $derived(total === 0 ? 0 : Math.round((ready.length / total) * 100));
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

  function sheets() {
    return ready.flatMap((challenge) => {
      const svg = posters.svgFor(challenge);
      return svg === null ? [] : [{ name: challenge.name, svg }];
    });
  }

  async function exportPdf(): Promise<void> {
    const pages = sheets();
    busy = true;
    failure = null;
    progress = { done: 0, total: pages.length };

    try {
      const blob = await buildPdf(pages, (value) => (progress = value));
      download(blob, `quest-posters-${pages.length}.pdf`);
    } catch (error) {
      failure = error instanceof Error ? error.message : "PDF export failed.";
    } finally {
      busy = false;
      progress = null;
    }
  }
</script>

<svelte:head><title>Poster Generator - Orientation Quest</title></svelte:head>

<header>
  <div class="title">
    <span class="mark">O&#8209;Quest</span>
    <h1>Challenge Posters</h1>
  </div>

  <div class="actions">
    {#if total > 0}
      <div class="tally">
        <span><strong>{ready.length}</strong>/{total} ready</span>
        <div class="meter"><i style="width: {pace}%"></i></div>
      </div>
    {/if}
    <button onclick={() => printPosters(sheets())} disabled={ready.length === 0 || busy}>
      Print
    </button>
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
      <h2><b>1</b>Challenge sheet</h2>
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
        <span class="sheeticon" aria-hidden="true"></span>
        <p>Drop the challenge CSV here</p>
        <label class="file">
          <input
            type="file"
            accept=".csv,text/csv"
            onchange={(event) => void read(event.currentTarget.files?.[0])}
          />
          <span>Choose file</span>
        </label>
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
                <option value="">-- none --</option>
                {#each posters.headers as header (header)}
                  <option value={header}>{header}</option>
                {/each}
              </select>
            </label>
          {/each}
        </div>
      {/if}
    </section>

    {#if total > 0}
      <section>
        <h2><b>2</b>Codes</h2>
        <p class="note">Four characters, <code>0-9</code> and <code>A-Z</code>.</p>
        <div class="row">
          <button onclick={() => posters.autoAssign()}>Auto-assign empty</button>
          <button onclick={() => posters.clearCodes()}>Clear</button>
        </div>
        <p class="note counts">
          <span class="dot"></span><strong>{ready.length}</strong> ready
          <span class="dot warn"></span><strong>{posters.blocked.length}</strong> open
        </p>
      </section>
    {/if}

    <section class="quiet">
      <h2><b>{total > 0 ? 3 : 2}</b>Templates</h2>
      {#if posters.categories.length > 0}
        <ul class="tpl">
          {#each posters.categories as entry (entry.slug)}
            <li>
              <span class="swatch" style="--tint: {tintFor(entry.slug)}"></span>
              <code>{entry.slug}</code>
              {#if !entry.hasTemplate}<em>missing</em>{/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="note">{templateCount} SVGs in <code>src/lib/templates/</code></p>
      {/if}
      <p class="tokens">
        {#each PLACEHOLDERS as token (token)}<code>{"{{"}{token}{"}}"}</code>{/each}
      </p>
      {#if posters.missingTemplates.length > 0}
        <ul class="missing">
          {#each posters.missingTemplates as entry (entry.slug)}
            <li><strong>{entry.category}</strong> needs <code>{entry.slug}.svg</code></li>
          {/each}
        </ul>
      {/if}
    </section>
  </aside>

  <div class="stage">
    {#if total === 0}
      <div class="empty">
        <span class="ghost" aria-hidden="true"></span>
        <p>Drop in the challenge sheet to see every poster.</p>
      </div>
    {:else}
      <div class="toolbar">
        <div class="chips">
          <button class:active={filter === ""} onclick={() => (filter = "")}>
            All <em>{total}</em>
          </button>
          {#each posters.categories as entry (entry.slug)}
            <button
              class:active={filter === entry.category}
              class:absent={!entry.hasTemplate}
              style="--tint: {tintFor(entry.slug)}"
              onclick={() => (filter = entry.category)}
            >
              <span class="swatch"></span>{entry.category} <em>{entry.count}</em>
            </button>
          {/each}
        </div>

        <div class="tools">
          <input
            type="text"
            class="search"
            placeholder="Search name or code"
            spellcheck="false"
            bind:value={query}
          />
          <label class="switch" class:on={onlyOpen}>
            <input type="checkbox" bind:checked={onlyOpen} />
            <span></span>Open only
          </label>
          <div class="segmented" role="group" aria-label="View">
            <button class:active={view === "grid"} onclick={() => (view = "grid")}>Grid</button>
            <button class:active={view === "list"} onclick={() => (view = "list")}>List</button>
          </div>
        </div>
      </div>

      {#if shown.length === 0}
        <p class="nohits">Nothing matches that filter.</p>
      {:else if view === "grid"}
        <div class="grid">
          {#each shown as challenge (challenge.key)}
            <PosterCard
              svg={posters.svgFor(challenge)}
              name={challenge.name}
              code={challenge.code}
              slug={challenge.slug}
              category={challenge.category}
              tint={tintFor(challenge.slug)}
              included={!posters.excluded(challenge.key)}
              valid={codeOk(challenge.code)}
              oncode={(value) => posters.setCode(challenge.key, value)}
              ontoggle={() => posters.toggle(challenge.key)}
            />
          {/each}
        </div>
      {:else}
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
                <td class="cell-name">
                  <span class="rail" style="--tint: {tintFor(challenge.slug)}"></span>{challenge.name}
                </td>
                <td>
                  <input
                    type="text"
                    class="code"
                    class:bad={challenge.code !== "" && !codeOk(challenge.code)}
                    value={challenge.code}
                    maxlength="4"
                    placeholder="----"
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
      {/if}
    {/if}
  </div>
</main>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 6;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    padding: 0.8rem clamp(1rem, 3vw, 2rem);
    background: color-mix(in srgb, var(--highlight) 90%, transparent);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--tertiary-dark);
  }

  .title {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .mark {
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: var(--primary);
    color: var(--highlight);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .title h1 {
    font-size: clamp(1.15rem, 2.4vw, 1.45rem);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .tally {
    display: grid;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--tertiary);
    font-variant-numeric: tabular-nums;
  }

  .tally strong {
    color: var(--secondary);
    font-size: 0.95rem;
  }

  .meter {
    width: 104px;
    height: 5px;
    border-radius: 999px;
    background: var(--tertiary-dark);
    overflow: hidden;
  }

  .meter i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--quest-done-ink), var(--quest-coin));
    transition: width 200ms ease;
  }

  .progress {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0.5rem clamp(1rem, 3vw, 2rem);
    border-bottom: 1px solid var(--tertiary-dark);
    background: var(--quest-done);
    font-size: 0.85rem;
    color: var(--ink-shade);
  }

  .bar {
    position: absolute;
    inset: 0 auto 0 0;
    background:
      repeating-linear-gradient(
        135deg,
        rgb(84 183 81 / 0.35) 0 10px,
        rgb(84 183 81 / 0.18) 10px 20px
      );
    transition: width 120ms linear;
  }

  .progress span {
    position: relative;
    font-variant-numeric: tabular-nums;
  }

  .failure {
    margin: 0;
    padding: 0.6rem clamp(1rem, 3vw, 2rem);
    background: #fdecef;
    border-bottom: 1px solid #f3c6cf;
    color: var(--primary);
    font-size: 0.9rem;
    font-weight: 600;
  }

  main {
    display: grid;
    grid-template-columns: minmax(250px, 300px) 1fr;
    gap: clamp(0.9rem, 1.8vw, 1.5rem);
    align-items: start;
    padding: clamp(0.9rem, 2.4vw, 1.6rem);
  }

  @media (max-width: 940px) {
    main {
      grid-template-columns: 1fr;
    }
  }

  aside {
    position: sticky;
    top: 4.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  section {
    padding: 0.9rem 1rem 1rem;
    background: var(--highlight);
    border: 1px solid var(--tertiary-dark);
    border-radius: 14px;
    box-shadow: 0 1px 0 var(--tertiary-dark), 0 10px 24px -20px rgb(0 0 0 / 0.5);
  }

  section.quiet {
    background: color-mix(in srgb, var(--highlight) 70%, var(--tertiary-normal));
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.92rem;
  }

  h2 b {
    display: grid;
    place-items: center;
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 999px;
    background: var(--primary);
    color: var(--highlight);
    font-size: 0.7rem;
    font-weight: 800;
  }

  .note {
    margin: 0.5rem 0 0;
    color: var(--tertiary);
    font-size: 0.8rem;
    line-height: 1.5;
  }

  .counts {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: var(--quest-done-ink);
  }

  .dot.warn {
    margin-left: 0.45rem;
    background: var(--quest-coin);
  }

  .drop {
    margin-top: 0.75rem;
    display: grid;
    gap: 0.45rem;
    justify-items: center;
    padding: 1rem;
    border: 2px dashed var(--tertiary-dark);
    border-radius: 12px;
    background:
      repeating-linear-gradient(
        45deg,
        var(--tertiary-normal) 0 9px,
        color-mix(in srgb, var(--tertiary-normal) 55%, var(--highlight)) 9px 18px
      );
    text-align: center;
    transition: border-color 140ms, background 140ms, transform 140ms;
  }

  .drop.dragging {
    border-color: var(--primary);
    background: var(--quest-done);
    transform: scale(1.015);
  }

  .sheeticon {
    width: 30px;
    height: 38px;
    border: 2px solid var(--tertiary);
    border-radius: 4px 9px 4px 4px;
    background:
      linear-gradient(var(--tertiary) 0 0) 5px 11px / 13px 2px no-repeat,
      linear-gradient(var(--tertiary) 0 0) 5px 18px / 18px 2px no-repeat,
      linear-gradient(var(--tertiary) 0 0) 5px 25px / 15px 2px no-repeat,
      var(--highlight);
  }

  .drop p {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--ink-shade);
  }

  .file input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  .file span {
    display: inline-block;
    padding: 0.35rem 0.8rem;
    border: 2px solid var(--secondary);
    border-radius: 999px;
    background: var(--highlight);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  .mapping {
    display: grid;
    gap: 0.45rem;
    margin-top: 0.7rem;
  }

  .mapping label {
    display: grid;
    gap: 0.15rem;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--tertiary);
  }

  .row {
    display: flex;
    gap: 0.45rem;
    margin-top: 0.7rem;
  }

  .row button {
    font-size: 0.78rem;
    padding: 0.35rem 0.7rem;
  }

  .tpl {
    margin: 0.6rem 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0.3rem;
  }

  .tpl li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.76rem;
    color: var(--tertiary);
  }

  .tpl em {
    font-style: normal;
    font-weight: 700;
    color: var(--primary);
  }

  .swatch {
    width: 0.6rem;
    height: 0.6rem;
    flex: none;
    border-radius: 3px;
    background: var(--tint, var(--tertiary));
  }

  .tokens {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin: 0.7rem 0 0;
  }

  .tokens code {
    padding: 0.1rem 0.3rem;
    border: 1px solid var(--tertiary-dark);
    border-radius: 5px;
    background: var(--highlight);
    font-size: 0.7rem;
  }

  .missing {
    margin: 0.7rem 0 0;
    padding: 0.5rem 0.65rem;
    list-style: none;
    border-left: 3px solid var(--quest-coin);
    border-radius: 0 8px 8px 0;
    background: #fff8e6;
    font-size: 0.78rem;
    line-height: 1.55;
    color: var(--ink-shade);
  }

  .stage {
    min-width: 0;
  }

  .empty {
    display: grid;
    justify-items: center;
    gap: 0.8rem;
    padding: 4.5rem 1rem;
    border: 2px dashed var(--tertiary-dark);
    border-radius: 16px;
    background: var(--highlight);
    color: var(--tertiary);
  }

  .ghost {
    width: 62px;
    height: 80px;
    border-radius: 6px;
    border: 2px solid var(--tertiary-dark);
    background:
      linear-gradient(var(--tertiary-dark) 0 0) 11px 20px / 40px 6px no-repeat,
      linear-gradient(var(--tertiary-dark) 0 0) 11px 37px / 28px 6px no-repeat,
      linear-gradient(var(--primary) 0 0) 11px 58px / 21px 8px no-repeat,
      var(--highlight);
  }

  .toolbar {
    position: sticky;
    top: 4.6rem;
    z-index: 4;
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding: 0.55rem 0.7rem;
    background: color-mix(in srgb, var(--highlight) 92%, transparent);
    backdrop-filter: blur(8px);
    border: 1px solid var(--tertiary-dark);
    border-radius: 16px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .chips button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: 999px;
    border-color: var(--tertiary-dark);
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.28rem 0.7rem;
  }

  .chips button em {
    font-style: normal;
    font-variant-numeric: tabular-nums;
    color: var(--tertiary);
  }

  .chips button.active {
    border-color: var(--tint, var(--secondary));
    background: color-mix(in srgb, var(--tint, var(--secondary)) 14%, var(--highlight));
  }

  .chips button.active em {
    color: var(--secondary);
  }

  .chips button.absent {
    color: var(--primary);
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .search {
    width: 12rem;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    border-width: 1.5px;
    font-size: 0.8rem;
  }

  .switch {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--tertiary);
    cursor: pointer;
  }

  .switch input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }

  .switch span {
    position: relative;
    width: 2rem;
    height: 1.1rem;
    border-radius: 999px;
    background: var(--tertiary-dark);
    transition: background 140ms;
  }

  .switch span::after {
    content: "";
    position: absolute;
    top: 0.15rem;
    left: 0.15rem;
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 999px;
    background: var(--highlight);
    transition: transform 140ms;
  }

  .switch.on {
    color: var(--secondary);
  }

  .switch.on span {
    background: var(--quest-done-ink);
  }

  .switch.on span::after {
    transform: translateX(0.9rem);
  }

  .segmented {
    display: flex;
    padding: 2px;
    border: 1.5px solid var(--tertiary-dark);
    border-radius: 999px;
    background: var(--tertiary-normal);
  }

  .segmented button {
    border: 0;
    background: none;
    border-radius: 999px;
    padding: 0.22rem 0.7rem;
    font-size: 0.76rem;
    font-weight: 700;
    color: var(--tertiary);
  }

  .segmented button.active {
    background: var(--highlight);
    color: var(--secondary);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.16);
  }

  .nohits {
    margin: 2rem 0;
    text-align: center;
    color: var(--tertiary);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(172px, 1fr));
    gap: 0.9rem;
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: var(--highlight);
    border: 1px solid var(--tertiary-dark);
    border-radius: 14px;
    font-size: 0.85rem;
  }

  th {
    text-align: left;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--tertiary);
    background: var(--tertiary-normal);
    padding: 0.5rem 0.65rem;
    border-bottom: 1px solid var(--tertiary-dark);
  }

  th:first-child {
    border-radius: 13px 0 0 0;
  }

  th:last-child {
    border-radius: 0 13px 0 0;
  }

  td {
    padding: 0.28rem 0.65rem;
    border-top: 1px solid color-mix(in srgb, var(--tertiary-dark) 55%, var(--highlight));
  }

  tbody tr:first-child td {
    border-top: 0;
  }

  tbody tr:hover td {
    background: color-mix(in srgb, var(--tertiary-normal) 60%, var(--highlight));
  }

  tr.skipped .cell-name {
    color: var(--muted);
    text-decoration: line-through;
  }

  .cell-name {
    max-width: 30rem;
    font-weight: 600;
  }

  .rail {
    display: inline-block;
    width: 3px;
    height: 0.95em;
    margin-right: 0.5rem;
    border-radius: 2px;
    background: var(--tint, var(--tertiary));
    vertical-align: -0.12em;
  }

  .code {
    width: 5rem;
    padding: 0.24rem 0.4rem;
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-align: center;
    text-transform: uppercase;
  }

  .code.bad {
    border-color: var(--primary);
    background: #fdecef;
  }

  .cell-slug code {
    color: var(--tertiary);
    font-size: 0.76rem;
  }

  .warn {
    color: var(--primary);
    font-weight: 700;
  }

  @media (prefers-reduced-motion: reduce) {
    .drop,
    .meter i,
    .bar,
    .switch span,
    .switch span::after {
      transition: none;
    }
  }
</style>
