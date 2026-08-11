<script lang="ts">
  import { fix } from "$lib/geo";
  import { type Quest, quests } from "$lib/quests.svelte";
  import { type Card, linkCard, placeCard, unlinkCard } from "$lib/staff.svelte";

  let {
    card,
    from = null,
    onclose,
  }: { card: Card; from?: string | null; onclose: () => void } = $props();

  let busy = $state<string | null>(null);
  let failed = $state<string | null>(null);
  let picking = $state(false);
  let query = $state("");

  const all = $derived<Quest[]>(quests.data ?? []);
  const linked = $derived(all.find((quest) => quest.id === card.challenge_id) ?? null);
  const placed = $derived(card.lat !== null && card.lon !== null);
  const challenge = $derived(
    linked ? linked.title : card.challenge_id ? "Linked, name unavailable" : "Not linked",
  );

  const scanned = $derived(all.find((quest) => quest.id === from) ?? null);

  const matches = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    const hit = (quest: Quest) =>
      needle === "" ||
      quest.title.toLowerCase().includes(needle) ||
      quest.category.toLowerCase().includes(needle);

    const rest = all.filter((quest) => quest.id !== scanned?.id).filter(hit);
    const head = scanned !== null && hit(scanned) ? [scanned] : [];

    return { head, rest };
  });

  $effect(() => {
    void quests.ensure();
  });

  async function run(label: string, action: () => Promise<unknown>): Promise<void> {
    if (busy) return;
    busy = label;
    failed = null;

    try {
      await action();
      picking = false;
    } catch (error) {
      failed = error instanceof Error ? error.message : "unknown";
    } finally {
      busy = null;
    }
  }

  function link(challengeId: string): void {
    void run("link", () => linkCard(card.card_id, challengeId));
  }

  function unlink(): void {
    void run("unlink", () => unlinkCard(card.card_id));
  }

  function place(): void {
    void run("place", async () => {
      const here = await fix();
      if (!here) throw new Error("no_location_fix");
      await placeCard(card.card_id, here.lat, here.lon);
    });
  }
</script>

<div class="scrim" role="presentation" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="sheet"
    role="dialog"
    aria-modal="true"
    aria-label="Card options"
    tabindex="-1"
    onclick={(event) => event.stopPropagation()}
  >
    <button class="close" type="button" aria-label="Close" onclick={onclose}>&times;</button>

    <p class="eyebrow">Staff mode</p>
    <h2><code>{card.card_id}</code></h2>

    <dl class="state">
      <div>
        <dt>Challenge</dt>
        <dd>{challenge}</dd>
      </div>
      <div>
        <dt>Position</dt>
        <dd>{placed ? `${card.lat?.toFixed(5)}, ${card.lon?.toFixed(5)}` : "Not set"}</dd>
      </div>
    </dl>

    {#if failed}
      <p class="failed">Couldn't do that: <code>{failed}</code></p>
    {/if}

    {#if picking}
      <input
        class="search"
        type="search"
        placeholder="Search challenges"
        aria-label="Search challenges"
        bind:value={query}
      />

      <ul class="picker">
        {#each matches.head as quest (quest.id)}
          <li>
            <button
              class="scanned"
              type="button"
              disabled={busy !== null}
              onclick={() => link(quest.id)}
            >
              <span>{quest.title}</span>
              <span class="now">{quest.id === card.challenge_id ? "current" : "scanned from"}</span>
            </button>
          </li>
        {/each}

        {#each matches.rest as quest (quest.id)}
          <li>
            <button type="button" disabled={busy !== null} onclick={() => link(quest.id)}>
              <span>{quest.title}</span>
              {#if quest.id === card.challenge_id}<span class="now">current</span>{/if}
            </button>
          </li>
        {/each}

        {#if matches.head.length === 0 && matches.rest.length === 0}
          <li class="empty">No challenge matches "{query}"</li>
        {/if}
      </ul>
      <button class="quit" type="button" onclick={() => (picking = false)}>Back</button>
    {:else}
      <div class="acts">
        <button
          class="fill"
          type="button"
          disabled={busy !== null}
          onclick={() => (picking = true)}
        >
          {card.challenge_id ? "Change challenge" : "Link to challenge"}
        </button>

        <button class="fill" type="button" disabled={busy !== null} onclick={place}>
          {busy === "place" ? "Reading GPS..." : placed ? "Update position" : "Set position here"}
        </button>

        {#if card.challenge_id}
          <button class="danger" type="button" disabled={busy !== null} onclick={unlink}>
            {busy === "unlink" ? "Removing..." : "Remove from challenge"}
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 38;
    display: flex;
    align-items: flex-end;
    background: rgb(0 0 0 / 0.55);
  }

  .sheet {
    position: relative;
    width: 100%;
    max-height: 100%;
    padding: calc(24 * var(--u)) calc(20 * var(--u))
      calc(24 * var(--u) + var(--safe-bottom));
    overflow-y: auto;
    border-radius: calc(24 * var(--u)) calc(24 * var(--u)) 0 0;
    background: var(--highlight);
  }

  .close {
    position: absolute;
    top: calc(14 * var(--u));
    right: calc(14 * var(--u));
    width: calc(32 * var(--u));
    height: calc(32 * var(--u));
    border: 0;
    border-radius: 50%;
    background: var(--tertiary-normal);
    color: var(--secondary);
    font-size: calc(20 * var(--u));
    line-height: 1;
    cursor: pointer;
  }

  .eyebrow {
    margin: 0;
    color: var(--tertiary);
    font-size: calc(13 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.4 * var(--u));
    text-transform: uppercase;
  }

  h2 {
    margin: calc(4 * var(--u)) 0 calc(16 * var(--u));
    color: var(--secondary);
    font-size: calc(22 * var(--u));
  }

  .state {
    display: grid;
    gap: calc(8 * var(--u));
    margin: 0 0 calc(16 * var(--u));
  }

  .state div {
    display: flex;
    justify-content: space-between;
    gap: calc(12 * var(--u));
  }

  dt {
    color: var(--tertiary);
    font-size: calc(14 * var(--u));
  }

  dd {
    margin: 0;
    color: var(--secondary);
    font-size: calc(14 * var(--u));
    font-weight: 600;
    text-align: right;
  }

  .failed {
    margin: 0 0 calc(12 * var(--u));
    color: var(--accent);
    font-size: calc(13 * var(--u));
  }

  .acts {
    display: grid;
    gap: calc(10 * var(--u));
  }

  button.fill,
  button.danger,
  button.quit {
    width: 100%;
    height: calc(48 * var(--u));
    border: 0;
    border-radius: calc(24 * var(--u));
    font: inherit;
    font-size: calc(15 * var(--u));
    font-weight: 700;
    cursor: pointer;
  }

  button.fill {
    background: var(--accent);
    color: var(--highlight);
  }

  button.danger {
    background: var(--tertiary-normal);
    color: var(--accent);
  }

  button.quit {
    margin-top: calc(10 * var(--u));
    background: none;
    color: var(--tertiary);
  }

  button:disabled {
    opacity: 0.6;
  }

  .search {
    width: 100%;
    height: calc(42 * var(--u));
    margin-bottom: calc(10 * var(--u));
    padding: 0 calc(14 * var(--u));
    border: 0;
    border-radius: calc(21 * var(--u));
    background: var(--tertiary-normal);
    color: var(--secondary);
    font: inherit;
    font-size: calc(15 * var(--u));
  }

  .scanned {
    border-radius: calc(10 * var(--u));
    background: var(--tertiary-normal);
  }

  .empty {
    padding: calc(14 * var(--u)) calc(4 * var(--u));
    color: var(--tertiary);
    font-size: calc(14 * var(--u));
  }

  .picker {
    max-height: calc(280 * var(--u));
    margin: 0 0 calc(4 * var(--u));
    padding: 0;
    overflow-y: auto;
    list-style: none;
  }

  .picker button {
    display: flex;
    justify-content: space-between;
    gap: calc(10 * var(--u));
    width: 100%;
    padding: calc(12 * var(--u)) calc(4 * var(--u));
    border: 0;
    border-bottom: 1px solid var(--tertiary-normal);
    background: none;
    color: var(--secondary);
    font: inherit;
    font-size: calc(15 * var(--u));
    text-align: left;
    cursor: pointer;
  }

  .now {
    color: var(--tertiary);
    font-size: calc(12 * var(--u));
  }

  code {
    font-family: ui-monospace, monospace;
  }
</style>
