<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import BadgeRail from "$lib/components/profile/BadgeRail.svelte";
  import WaveEdge from "$lib/components/ui/WaveEdge.svelte";
  import WarningDialog from "$lib/components/shell/WarningDialog.svelte";
  import { BADGE_ROWS, type Progress } from "$lib/badges";
  import { session } from "$lib/auth";
  import { fit } from "$lib/fit";
  import { MASCOTS } from "$lib/mascots";
  import { done, inCategory, quests } from "$lib/quests.svelte";
  import { setStaffMode, staffMode } from "$lib/staff.svelte";
  import { me } from "$lib/user.svelte";
  import { refresh, wallet } from "$lib/wallet.svelte";

  let open = $state<string | null>(null);
  let confirming = $state(false);
  onMount(() => {
    void me.reload();
  });

  $effect(() => {
    void quests.ensure();
    void refresh();
  });

  const slug = $derived(me.mascot);
  const entry = $derived(slug === null ? null : (MASCOTS[slug] ?? null));
  const dorm = $derived(entry?.mascot.home ?? "");

  const name = $derived(session.user?.name ?? session.user?.andrewId ?? "Orientation Quest");
  const handle = $derived(me.current?.andrew_id ?? session.user?.andrewId ?? "");

  const all = $derived(quests.data ?? []);
  const progress = $derived<Progress>({
    challenges: done(all),
    total: all.length,
    gems: wallet.lifetimeGems,
    finished: new Set(
      BADGE_ROWS.flatMap((row) => row.badges)
        .map((badge) => badge.category)
        .filter((id): id is string => id !== undefined)
        .filter((id) => {
          const list = inCategory(all, id);
          return list.length > 0 && done(list) === list.length;
        }),
    ),
  });

  async function signOut() {
    await session.logout();
    await goto("/");
  }
</script>

<svelte:head><title>Badges - Orientation Quest</title></svelte:head>

<svelte:window onpointerdown={() => (open = null)} />

<section>
  <header>
    <span class="deep" aria-hidden="true"><WaveEdge shape="crown" /></span>
    <span class="mid" aria-hidden="true"><WaveEdge shape="crown" /></span>
    <span class="glow" aria-hidden="true"></span>

    <div class="frame">
      {#if dorm}
        <svg class="arc" viewBox="0 0 286 286" aria-hidden="true">
          <path id="crest-arc" d="M 152 39 A 104 104 0 0 1 228 203" fill="none" />
          <text>
            <textPath href="#crest-arc" startOffset="50%" text-anchor="middle">{dorm}</textPath>
          </text>
        </svg>
      {/if}

      <span class="crest">
        {#if entry}
          <img src="/img/mascots/{slug}.svg" alt="" />
        {/if}
      </span>

      <div class="who">
        <p class="name" use:fit={name}>{name}</p>
        <p class="handle" use:fit={handle}>{handle}</p>
        <p class="kind">Badges</p>
      </div>
    </div>
  </header>

  <div class="board">
    {#if entry === null}
      <button class="pick" type="button" onclick={() => goto("/mascots")}>
        Choose your dorm
      </button>
    {/if}

    {#each BADGE_ROWS as row (row.id)}
      <BadgeRail {row} {progress} bind:open />
    {/each}

    {#if session.user?.staff || session.user?.admin}
      <div class="toggle">
        <span id="staffmode">Staff mode</span>
        <button
          class="switch"
          type="button"
          role="switch"
          aria-checked={staffMode.on}
          aria-labelledby="staffmode"
          onclick={() => setStaffMode(!staffMode.on)}
        >
          <span class="knob"></span>
        </button>
      </div>
      <p class="note">
        {staffMode.on
          ? "Tapping a card opens placement options instead of scoring it."
          : "Turn on to link cards to challenges and set their positions."}
      </p>
    {/if}

    <div class="acts">
      <button class="out" type="button" onclick={signOut}>Sign out</button>
      <button class="nuke" type="button" onclick={() => (confirming = true)}>
        Delete account
      </button>
    </div>
  </div>
</section>

{#if confirming}
  <WarningDialog
    title="Delete your account?"
    body="This permanantly deletes your account and removes your Orientation Quest progress. Are you sure?"
    confirm="Delete account"
    dismiss="Keep it"
    onconfirm={signOut}
    ondismiss={() => (confirming = false)}
  />
{/if}

<style>
  section {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow-x: clip;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--highlight);
  }

  header {
    position: relative;
    flex: none;
    height: calc(373 * var(--u));
    overflow: clip;
  }

  .deep,
  .mid {
    position: absolute;
    pointer-events: none;
  }

  .deep {
    top: calc(-58 * var(--u));
    right: calc(-22 * var(--u));
    left: calc(-31 * var(--u));
    height: calc(427 * var(--u));
    color: #831421;
  }

  .mid {
    top: calc(-106 * var(--u));
    right: calc(-30 * var(--u));
    left: calc(-23 * var(--u));
    height: calc(387 * var(--u));
    color: #c41230;
  }

  .glow {
    position: absolute;
    top: calc(-6 * var(--u));
    right: calc(-25 * var(--u));
    left: calc(-3 * var(--u));
    height: calc(187 * var(--u));
    background: linear-gradient(180deg, #c41230, #990012);
    pointer-events: none;
  }

  .frame {
    position: relative;
    width: var(--frame);
    max-width: 100%;
    height: 100%;
    margin-inline: auto;
  }

  .arc {
    position: absolute;
    top: calc(44 * var(--u));
    left: calc(-18 * var(--u));
    width: calc(286 * var(--u));
    height: calc(286 * var(--u));
    fill: var(--highlight);
    font-size: calc(23 * var(--u));
    font-weight: 700;
    letter-spacing: calc(1.2 * var(--u));
    pointer-events: none;
    text-transform: uppercase;
  }

  .crest {
    position: absolute;
    top: calc(87 * var(--u));
    left: calc(24 * var(--u));
    display: grid;
    width: calc(201 * var(--u));
    height: calc(201 * var(--u));
    background: #9f0216;
    border: calc(13 * var(--u)) solid var(--highlight);
    border-radius: 50%;
    overflow: clip;
    place-items: center;
  }

  .crest img {
    width: calc(142 * var(--u));
    height: calc(142 * var(--u));
    border-radius: 50%;
    object-fit: contain;
  }

  .who {
    position: absolute;
    top: calc(70 * var(--u));
    right: calc(16 * var(--u));
    width: calc(159 * var(--u));
    color: var(--highlight);
    text-align: right;
  }

  .who p {
    margin: 0;
    overflow: hidden;
    font-size: calc(32 * var(--u));
    letter-spacing: calc(0.64 * var(--u));
    line-height: 1.44;
    overflow-wrap: anywhere;
  }

  .name {
    height: calc(92 * var(--u));
    font-weight: 700;
  }

  .who .handle {
    height: calc(46 * var(--u));
    margin-top: calc(30 * var(--u));
  }

  .who .kind {
    margin-top: calc(53 * var(--u));
    font-style: italic;
    font-weight: 600;
  }

  .board {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: calc(16 * var(--u));
    width: 100%;
    max-width: var(--column);
    margin-inline: auto;
    padding: 0 calc(22 * var(--u)) var(--dock-clear);
  }

  .pick {
    align-self: flex-start;
    padding: calc(8 * var(--u)) calc(16 * var(--u));
    border: 0;
    border-radius: calc(20 * var(--u));
    background: var(--primary);
    color: var(--highlight);
    font-family: inherit;
    font-size: calc(15 * var(--u));
    font-weight: 700;
    cursor: pointer;
  }

  .toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: calc(12 * var(--u));
    margin-top: calc(18 * var(--u));
    color: var(--secondary);
    font-size: calc(15 * var(--u));
    font-weight: 700;
  }

  .switch {
    display: flex;
    align-items: center;
    width: calc(52 * var(--u));
    padding: calc(3 * var(--u));
    border: 0;
    border-radius: calc(14 * var(--u));
    background: var(--tertiary-normal);
    cursor: pointer;
    transition: background 120ms ease;
  }

  .switch[aria-checked="true"] {
    background: var(--accent);
    justify-content: flex-end;
  }

  .knob {
    display: block;
    width: calc(22 * var(--u));
    height: calc(22 * var(--u));
    border-radius: 50%;
    background: var(--highlight);
  }

  .note {
    margin: calc(6 * var(--u)) 0 0;
    color: var(--tertiary);
    font-size: calc(13 * var(--u));
  }

  .acts {
    display: flex;
    gap: calc(12 * var(--u));
    margin-top: calc(16 * var(--u));
  }

  .acts button {
    flex: 1;
    padding: calc(12 * var(--u)) calc(10 * var(--u));
    border: 0;
    border-radius: calc(14 * var(--u));
    font-family: inherit;
    font-size: calc(15 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.3 * var(--u));
    cursor: pointer;
  }

  .out {
    background: var(--tertiary-normal);
    color: var(--ink-shade);
  }

  .nuke {
    background: var(--primary);
    color: var(--highlight);
  }

  .acts button:active {
    translate: 0 calc(1 * var(--u));
  }
</style>
