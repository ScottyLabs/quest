<script lang="ts">
  import type { AssetLibrary, AssetView } from "$lib/api/client";
  import { api, message, unwrap, uploadAsset } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Chip from "$lib/components/Chip.svelte";
  import Empty from "$lib/components/Empty.svelte";
  import Field from "$lib/components/Field.svelte";
  import Panel from "$lib/components/Panel.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { me } from "$lib/identity.svelte";
  import { announce } from "$lib/notice.svelte";

  const allowed = $derived(me.can("assets"));

  let library = $state<AssetLibrary | null>(null);
  let loading = $state(true);
  let failure = $state<string | null>(null);
  let kind = $state("uploads");
  let filter = $state("");
  let busy = $state(false);
  let dragging = $state(false);
  let removing = $state<string | null>(null);
  let field = $state<HTMLInputElement | null>(null);
  let queued = $state<{ name: string; state: "sending" | "done" | "failed"; note?: string }[]>([]);

  const cap = $derived(Math.floor((library?.max_bytes ?? 0) / (1024 * 1024)));

  const shown = $derived.by(() => {
    const needle = filter.trim().toLowerCase();
    const rows = library?.assets ?? [];

    if (needle === "") return rows;

    return rows.filter(
      (a) =>
        a.key.toLowerCase().includes(needle) ||
        (a.filename ?? "").toLowerCase().includes(needle) ||
        a.uploaded_by.toLowerCase().includes(needle),
    );
  });

  async function load(): Promise<void> {
    try {
      library = await unwrap(await api.GET("/api/portal/assets", { params: { query: {} } }));
      failure = null;
    } catch (error) {
      failure = message(error);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (allowed) void load();
    else loading = false;
  });

  function size(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function when(stamp: string): string {
    const at = new Date(stamp);

    return Number.isNaN(at.getTime()) ? stamp : at.toLocaleString();
  }

  function previewable(type: string): boolean {
    return type.startsWith("image/");
  }

  async function send(files: File[]): Promise<void> {
    if (files.length === 0) return;

    busy = true;
    queued = files.map((file) => ({ name: file.name, state: "sending" as const }));

    for (const [index, file] of files.entries()) {
      try {
        const done = await uploadAsset(kind, file);
        queued[index] = { name: file.name, state: "done", note: done.url };
      } catch (error) {
        queued[index] = { name: file.name, state: "failed", note: message(error) };
      }
    }

    const good = queued.filter((q) => q.state === "done").length;
    const bad = queued.length - good;

    if (good > 0) announce(`Uploaded ${good} file${good === 1 ? "" : "s"}.`, "good");
    if (bad > 0) announce(`${bad} upload${bad === 1 ? "" : "s"} failed.`, "bad", 12000);

    busy = false;
    await load();
  }

  async function picked(event: Event & { currentTarget: HTMLInputElement }): Promise<void> {
    const input = event.currentTarget;
    const files = [...(input.files ?? [])];

    await send(files);
    input.value = "";
  }

  async function dropped(event: DragEvent): Promise<void> {
    event.preventDefault();
    dragging = false;

    await send([...(event.dataTransfer?.files ?? [])]);
  }

  async function copy(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      announce("URL copied.", "good", 2500);
    } catch {
      announce("The browser refused clipboard access.", "bad");
    }
  }

  async function remove(asset: AssetView): Promise<void> {
    removing = null;
    busy = true;

    try {
      await unwrap(await api.DELETE("/api/portal/assets", { body: { key: asset.key } }));
      announce(`Deleted ${asset.filename ?? asset.key}.`, "good");
      await load();
    } catch (error) {
      announce(message(error), "bad", 12000);
    } finally {
      busy = false;
    }
  }
</script>

<header class="head">
  <h1>Uploads</h1>
  <p>
    Files go to the ScottyLabs Garage bucket and are served from the CDN, so the URL below works
    anywhere &mdash; paste it into an item image, a challenge, or anything else. One bucket is shared
    by every environment, so treat what you upload as public and permanent-ish.
  </p>
</header>

{#if !allowed}
  <Empty
    title="Uploading needs the assets capability"
    detail="Team leads, orientation staff and trade admins have it. Ask a team lead if you need it."
  />
{:else if loading}
  <Spinner label="Loading the library" />
{:else if failure !== null && library === null}
  <Empty title="The library did not load" detail={failure} />
{:else}
  {#if library !== null && !library.ready}
    <div class="warn" role="alert">
      <p class="lead">Uploads are switched off</p>
      <p>
        The backend has no CDN credentials, so it will refuse every upload. Set the five
        <code>CDN_*</code> secrets and restart it.
      </p>
    </div>
  {/if}

  <div class="layout">
    <Panel title="Add files" detail="Drop them in, or pick them. Several at once is fine.">
      {#snippet actions()}
        <Button
          size="small"
          onclick={() => field?.click()}
          disabled={busy || library?.ready === false}
        >
          Choose files
        </Button>
      {/snippet}

      <input
        bind:this={field}
        class="file"
        type="file"
        multiple
        onchange={(event) => void picked(event)}
      />

      <div class="pickers">
        <Field label="File under" hint="becomes the first part of the key">
          <select bind:value={kind}>
            {#each library?.kinds ?? [] as option (option)}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </Field>
      </div>

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="drop"
        class:dragging
        ondragover={(event) => {
          event.preventDefault();
          dragging = true;
        }}
        ondragleave={() => (dragging = false)}
        ondrop={(event) => void dropped(event)}
      >
        {#if busy}
          <Spinner label="Uploading" />
        {:else}
          <p class="lead">Drop files here</p>
          <p class="hint">Any file type, up to {cap} MB each.</p>
        {/if}
      </div>

      {#if queued.length > 0}
        <ul class="queue">
          {#each queued as item, index (index)}
            <li>
              <span class="name">{item.name}</span>
              {#if item.state === "sending"}
                <Chip>sending</Chip>
              {:else if item.state === "done"}
                <Chip tone="good">done</Chip>
              {:else}
                <Chip tone="bad">failed</Chip>
              {/if}
              {#if item.state === "failed" && item.note !== undefined}
                <span class="why">{item.note}</span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>

    <Panel
      title="On the CDN"
      detail={`${library?.assets.length ?? 0} recorded uploads, newest first`}
      flush
    >
      {#snippet actions()}
        <input
          class="search"
          type="search"
          placeholder="Filter by name, key or uploader"
          bind:value={filter}
        />
        <Button tone="line" size="small" onclick={() => void load()} disabled={busy}>Refresh</Button>
      {/snippet}

      {#if shown.length === 0}
        <Empty
          title={(library?.assets.length ?? 0) === 0 ? "Nothing uploaded yet" : "Nothing matches"}
          detail={(library?.assets.length ?? 0) === 0
            ? "The first file you add will show up here with its CDN URL."
            : `No upload matches ${filter.trim()}.`}
        />
      {:else}
        <ul class="assets">
          {#each shown as asset (asset.key)}
            <li>
              <div class="thumb">
                {#if previewable(asset.content_type)}
                  <img src={asset.url} alt="" loading="lazy" />
                {:else}
                  <span class="ext">{asset.key.split(".").pop()}</span>
                {/if}
              </div>

              <div class="about">
                <p class="title">{asset.filename ?? asset.key}</p>
                <p class="meta">
                  <Chip>{asset.kind}</Chip>
                  {size(asset.bytes)} &middot; {asset.uploaded_by} &middot; {when(asset.created_at)}
                </p>
                <code class="url">{asset.url}</code>
              </div>

              <div class="acts">
                <Button tone="line" size="small" onclick={() => void copy(asset.url)}>
                  Copy URL
                </Button>
                <a class="open" href={asset.url} target="_blank" rel="noreferrer">Open</a>
                {#if removing === asset.key}
                  <Button tone="danger" size="small" onclick={() => void remove(asset)} {busy}>
                    Really delete
                  </Button>
                  <Button tone="ghost" size="small" onclick={() => (removing = null)}>Keep</Button>
                {:else}
                  <Button tone="ghost" size="small" onclick={() => (removing = asset.key)}>
                    Delete
                  </Button>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </Panel>
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

  .warn {
    margin: 0 0 20px;
    padding: 12px 16px;
    border: 1px solid var(--warn);
    border-radius: var(--radius);
    background: var(--warn-fill);
    color: var(--warn);
  }

  .warn p {
    margin: 0;
    font-size: 13px;
  }

  .lead {
    font-size: 14px;
    font-weight: 800;
  }

  .layout {
    display: grid;
    gap: 20px;
    align-items: start;
    grid-template-columns: 22rem minmax(0, 1fr);
  }

  @media (max-width: 68rem) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .file {
    display: none;
  }

  .pickers {
    margin: 0 0 14px;
  }

  .drop {
    display: grid;
    padding: 26px 16px;
    border: 1px dashed var(--muted);
    border-radius: var(--radius);
    background: var(--canvas);
    text-align: center;
    place-items: center;
  }

  .drop.dragging {
    border-color: var(--accent);
    background: var(--tint);
  }

  .drop .lead {
    margin: 0;
    color: var(--ink-shade);
  }

  .hint {
    margin: 4px 0 0;
    color: var(--tertiary);
    font-size: 12px;
  }

  .queue,
  .assets {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .queue {
    margin-top: 14px;
  }

  .queue li {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 5px 0;
    border-bottom: 1px solid var(--line);
    font-size: 12px;
  }

  .queue .name {
    flex: 1;
    overflow: hidden;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .why {
    flex-basis: 100%;
    color: var(--danger);
  }

  .search {
    width: 15rem;
    padding: 5px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    font-size: 12px;
  }

  .assets li {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid var(--line);
  }

  .assets li:hover {
    background: var(--canvas);
  }

  .thumb {
    display: grid;
    flex: none;
    width: 52px;
    height: 52px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--tertiary-normal);
    overflow: hidden;
    place-items: center;
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .ext {
    color: var(--tertiary);
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .about {
    flex: 1;
    min-width: 0;
  }

  .title {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 3px 0;
    color: var(--tertiary);
    font-size: 12px;
  }

  .url {
    display: block;
    overflow: hidden;
    color: var(--primary-light);
    font-family: var(--mono);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .acts {
    display: flex;
    flex: none;
    gap: 6px;
    align-items: center;
  }

  .open {
    padding: 0 6px;
    color: var(--tertiary);
    font-size: 12px;
    font-weight: 700;
  }
</style>
