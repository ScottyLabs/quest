<script lang="ts">
  import { goto } from "$app/navigation";
  import { session } from "$lib/auth";
  import { MASCOTS } from "$lib/mascots";
  import { profile, type Profile } from "$lib/user";

  let me = $state<Profile | null>(null);
  let loading = $state(true);

  $effect(() => {
    void profile().then((found) => {
      me = found;
      loading = false;
    });
  });

  const cached = $derived(loading ? null : localStorage.getItem("quest.mascot"));
  const slug = $derived(
    Object.keys(MASCOTS).find((key) => MASCOTS[key]?.mascot.dorm === me?.dorm) ?? cached,
  );
  const mascot = $derived(slug === null ? null : (MASCOTS[slug]?.mascot ?? null));

  async function signOut() {
    await session.logout();
    await goto("/");
  }
</script>

<svelte:head><title>Profile - Orientation Quest</title></svelte:head>

<section>
  <h1>{session.user?.name ?? session.user?.andrewId ?? "Orientation Quest player"}</h1>

  <div class="card">
    {#if mascot}
      <img src="/img/mascots/{slug}.svg" alt="" width="96" height="96" />
      <p class="dorm">{mascot.name}</p>
    {:else}
      <p class="quiet">No dorm chosen yet.</p>
      <button class="link" onclick={() => goto("/mascots")}>Choose your dorm</button>
    {/if}

    <dl>
      <dt>Andrew ID</dt>
      <dd>{me?.andrew_id ?? session.user?.andrewId ?? "-"}</dd>
      <dt>Dorm</dt>
      <dd>{me?.dorm ?? mascot?.dorm ?? "-"}</dd>
    </dl>
  </div>

  <button class="out" onclick={signOut}>Sign out</button>
</section>

<style>
  section {
    display: grid;
    flex: 1;
    align-content: start;
    justify-items: center;
    gap: 16px;
    min-height: 0;
    padding: calc(24px + var(--safe-top)) 23px var(--dock-clear);
    overflow-y: auto;
  }

  h1 {
    margin: 0;
    color: var(--highlight);
    font-size: 21px;
    font-weight: 700;
    letter-spacing: 0.42px;
  }

  .card {
    display: grid;
    justify-items: center;
    gap: 8px;
    width: 100%;
    padding: 20px;
    border-radius: 20px;
    background: var(--highlight);
    text-align: center;
  }

  .dorm {
    margin: 0;
    color: var(--shade);
    font-size: 17px;
    font-weight: 600;
  }

  .quiet {
    margin: 0;
    color: var(--tertiary);
    font-size: 15px;
  }

  dl {
    display: grid;
    grid-template-columns: auto auto;
    gap: 4px 16px;
    margin: 8px 0 0;
    font-size: 14px;
  }

  dt {
    color: var(--tertiary);
    text-align: right;
  }

  dd {
    margin: 0;
    color: var(--secondary);
    text-align: left;
  }

  .link {
    border: 0;
    background: none;
    color: var(--shade);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }

  .out {
    width: 100%;
    padding: 14px 16px;
    border: 0;
    border-radius: 999px;
    background: var(--shade);
    color: var(--highlight);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
</style>
