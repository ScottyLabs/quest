<script lang="ts">
  import Chip from "$lib/components/Chip.svelte";
  import Panel from "$lib/components/Panel.svelte";
  import { me } from "$lib/identity.svelte";
  import { HOME, SECTIONS } from "$lib/nav";

  const ROLE_NAMES: Record<string, string> = {
    admins: "Team lead",
    "orientation-staff": "Orientation staff",
    "trade-admin": "Trade admin",
    "challenge-placer": "Challenge placer",
  };

  const LEVEL_TONES = {
    read: "neutral",
    edit: "warn",
    full: "good",
    none: "bad",
  } as const;

  const identity = $derived(me.identity);
  const places = $derived(SECTIONS.filter((section) => section.href !== HOME && section.visible()));
</script>

<header class="head">
  <h1>Welcome, {me.name}</h1>
  <p>
    Everything below is what your Keycloak groups allow. Access is decided in one place on the
    backend, so a change to your groups shows up here the next time you sign in.
  </p>
</header>

<div class="grid">
  <Panel title="Your roles" detail="Keycloak groups resolved into portal roles">
    {#if identity !== null && identity.roles.length > 0}
      <ul class="roles">
        {#each identity.roles as role (role)}
          <li>
            <span class="role">{ROLE_NAMES[role] ?? role}</span>
            <code>{role}</code>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="muted">No roles. You should not be seeing this page.</p>
    {/if}

    <p class="caption">Group paths on your token</p>
    <ul class="groups">
      {#each identity?.groups ?? [] as group (group)}
        <li><code>{group}</code></li>
      {/each}
    </ul>
  </Panel>

  <Panel title="What you can do" detail="Capabilities granted by those roles">
    <ul class="caps">
      {#each identity?.capabilities ?? [] as capability (capability)}
        <li><Chip tone="accent">{capability.replace(/_/gu, " ")}</Chip></li>
      {/each}
    </ul>

    <p class="caption">Where to go</p>
    <ul class="links">
      {#each places as section (section.href)}
        <li>
          <a href={section.href}>{section.label}</a>
          <span>{section.detail}</span>
        </li>
      {/each}
    </ul>
  </Panel>

  <Panel title="Tables you may reach" detail="Strongest level held per table">
    <ul class="tables">
      {#each identity?.tables ?? [] as grant (grant.table)}
        <li>
          <code>{grant.table}</code>
          <Chip tone={LEVEL_TONES[grant.level]}>{grant.level}</Chip>
        </li>
      {/each}
    </ul>
  </Panel>
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

  .grid {
    display: grid;
    gap: 20px;
    align-items: start;
    grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .roles li {
    display: flex;
    gap: 8px;
    align-items: baseline;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid var(--line);
  }

  .role {
    font-size: 13px;
    font-weight: 700;
  }

  .caption {
    margin: 18px 0 6px;
    color: var(--ink-shade);
    font-size: 12px;
    font-weight: 700;
  }

  .groups li,
  .tables li {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
  }

  .caps {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .links li {
    display: flex;
    flex-direction: column;
    padding: 7px 0;
    border-bottom: 1px solid var(--line);
  }

  .links a {
    font-size: 13px;
    font-weight: 700;
  }

  .links span {
    color: var(--tertiary);
    font-size: 12px;
  }

  code {
    color: var(--tertiary);
    font-family: var(--mono);
    font-size: 11px;
    overflow-wrap: anywhere;
  }

  .muted {
    margin: 0;
    color: var(--tertiary);
    font-size: 13px;
  }
</style>
