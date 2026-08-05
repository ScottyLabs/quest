<script lang="ts">
  import { goto } from "$app/navigation";
  import { session } from "$lib/auth";
  import { MASCOTS } from "$lib/mascots";
  import { profile, type Profile } from "$lib/user";
  import { diagnose, type Diagnosis } from "$lib/diagnose";

  // Placeholder landing for a signed-in user. Replace with the real home.
  let me = $state<Profile | null>(null);
  let loading = $state(true);
  let checks = $state<Diagnosis | null>(null);

  $effect(() => {
    if (!session.signedIn) {
      void goto("/");
      return;
    }

    void profile().then((found) => {
      me = found;
      loading = false;
    });

    void diagnose().then((found) => {
      checks = found;
    });
  });

  // The server is the source of truth, but it may not have `/users/me` yet —
  // fall back to the pick the carousel cached rather than claiming none exists.
  const cached = $derived(loading ? null : (localStorage.getItem("quest.mascot") ?? null));
  const slug = $derived(
    Object.keys(MASCOTS).find((key) => MASCOTS[key]?.mascot.dorm === me?.dorm) ?? cached,
  );
  const mascot = $derived(slug === null ? null : (MASCOTS[slug]?.mascot ?? null));

  async function signOut() {
    await session.logout();
    await goto("/");
  }
</script>

<div class="screen">
  <main>
    {#if loading}
      <p class="quiet">Loading&hellip;</p>
    {:else}
      <p class="quiet">Signed in as</p>
      <h1>{session.user?.name ?? session.user?.andrewId ?? "Quest player"}</h1>

      {#if mascot}
        <img src="/img/mascots/{slug}.svg" alt="" width="96" height="96" />
        <p class="dorm">{mascot.name}</p>
      {:else}
        <p class="quiet">No dorm chosen yet.</p>
        <button class="link" onclick={() => goto("/mascots")}>Choose your dorm</button>
      {/if}

      <dl>
        <dt>Andrew ID</dt>
        <dd>{me?.andrew_id ?? session.user?.andrewId ?? "—"}</dd>
        <dt>Dorm</dt>
        <dd>{me?.dorm ?? mascot?.dorm ?? "—"}</dd>
      </dl>

      {#if checks}
        <pre class="checks">{Object.entries(checks)
            .map(([key, value]) => `${key}: ${String(value)}`)
            .join("\n")}</pre>
      {/if}
    {/if}
  </main>

  <div class="actions">
    <button onclick={signOut}>Sign out</button>
  </div>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    padding: calc(27px + env(safe-area-inset-top)) 24px calc(14px + env(safe-area-inset-bottom));
    background: var(--highlight);
    text-align: center;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }

  h1 {
    margin: 0 0 8px;
    font-size: 24px;
    font-weight: 700;
    color: var(--primary-dark);
  }

  .quiet {
    margin: 0;
    font-size: 15px;
    color: var(--tertiary);
  }

  .dorm {
    margin: 4px 0 0;
    font-size: 17px;
    font-weight: 600;
    color: var(--primary);
  }

  dl {
    display: grid;
    grid-template-columns: auto auto;
    gap: 4px 16px;
    margin: 20px 0 0;
    font-size: 14px;
  }

  dt {
    color: var(--tertiary);
    text-align: right;
  }

  dd {
    margin: 0;
    text-align: left;
    color: var(--primary-dark);
  }

  .checks {
    margin: 16px 0 0;
    padding: 10px 12px;
    max-width: 100%;
    border-radius: 8px;
    background: var(--tertiary-normal);
    font-family: ui-monospace, monospace;
    font-size: 11px;
    line-height: 1.5;
    text-align: left;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--primary-dark);
  }

  .link {
    border: none;
    background: none;
    color: var(--primary);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }

  .actions {
    flex: none;
  }

  .actions button {
    width: 100%;
    padding: 14px 16px;
    border: none;
    border-radius: 999px;
    background: var(--primary);
    color: var(--highlight);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
</style>
