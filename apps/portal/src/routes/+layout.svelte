<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { api, message } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Toast from "$lib/components/Toast.svelte";
  import { me } from "$lib/identity.svelte";
  import { activeHref, CALLBACK, SECTIONS } from "$lib/nav";
  import { announce } from "$lib/notice.svelte";
  import { session } from "$lib/session.svelte";

  let { children } = $props();

  session.restore();

  let denied = $state<string | null>(null);

  const onCallback = $derived(page.url.pathname.replace(/\/+$/u, "") === CALLBACK.replace(/\/+$/u, ""));

  $effect(() => {
    if (onCallback || !session.signedIn) return;

    me.load().catch((error: unknown) => (denied = message(error)));
  });

  const sections = $derived(SECTIONS.filter((section) => section.visible()));
  const active = $derived(
    activeHref(
      page.url.pathname,
      sections.map((section) => section.href),
    ),
  );
  const ready = $derived(session.signedIn && me.settled && me.identity !== null);

  async function signOut(): Promise<void> {
    try {
      await api.POST("/api/portal/sign-out", {});
    } catch (error) {
      announce(message(error), "bad");
    }

    session.clear();
    me.forget();
    denied = null;
  }
</script>

<svelte:head><title>Quest Portal</title></svelte:head>

{#if onCallback}
  {@render children()}
{:else if session.phase === "restoring"}
  <div class="booting"><Spinner label="Restoring your session" /></div>
{:else if !session.signedIn}
  <main class="gate">
    <div class="card">
      <p class="crest">Orientation Quest</p>
      <h1>Staff portal</h1>
      <p class="copy">
        Sign in with your Andrew ID. Access is granted by ScottyLabs Keycloak group, so ask a team
        lead if the portal turns you away.
      </p>
      <Button onclick={() => session.start()}>Sign in with Keycloak</Button>
    </div>
  </main>
{:else if denied !== null}
  <main class="gate">
    <div class="card">
      <p class="crest">Orientation Quest</p>
      <h1>No portal access</h1>
      <p class="copy">{denied}</p>
      <Button tone="line" onclick={signOut}>Sign out</Button>
    </div>
  </main>
{:else if !ready}
  <div class="booting"><Spinner label="Loading your permissions" /></div>
{:else}
  <div class="shell">
    <aside>
      <div class="brand">
        <span class="mark">Q</span>
        <div>
          <p class="title">Quest Portal</p>
          <p class="sub">{me.andrewId}</p>
        </div>
      </div>

      <nav>
        {#each sections as section (section.href)}
          <a
            href={section.href}
            class:on={active === section.href}
            aria-current={active === section.href ? "page" : undefined}
          >
            {section.label}
          </a>
        {/each}
      </nav>

      <div class="foot">
        <p class="who">{me.name}</p>
        <Button tone="ghost" size="small" onclick={signOut}>Sign out</Button>
      </div>
    </aside>

    <main>{@render children()}</main>
  </div>
{/if}

<Toast />

<style>
  .booting {
    display: grid;
    min-height: 100dvh;
    place-items: center;
  }

  .gate {
    display: grid;
    min-height: 100dvh;
    padding: 24px;
    place-items: center;
  }

  .gate .card {
    width: 100%;
    max-width: 25rem;
    padding: 32px;
    border-radius: var(--radius-lg);
    background: var(--highlight);
    box-shadow: var(--lift);
    text-align: center;
  }

  .crest {
    margin: 0;
    color: var(--accent);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.4px;
    text-transform: uppercase;
  }

  .gate h1 {
    margin: 6px 0 10px;
    font-size: 24px;
    font-weight: 800;
  }

  .copy {
    margin: 0 0 22px;
    color: var(--tertiary);
    font-size: 13px;
    line-height: 1.6;
  }

  .shell {
    display: grid;
    min-height: 100dvh;
    grid-template-columns: var(--rail) minmax(0, 1fr);
  }

  aside {
    display: flex;
    position: sticky;
    top: 0;
    flex-direction: column;
    height: 100dvh;
    padding: 20px 14px;
    border-right: 1px solid var(--line);
    background: var(--highlight);
  }

  .brand {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 0 8px 18px;
  }

  .mark {
    display: grid;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: var(--accent);
    color: var(--highlight);
    font-size: 16px;
    font-weight: 800;
    place-items: center;
  }

  .title {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
  }

  .sub {
    margin: 0;
    color: var(--tertiary);
    font-family: var(--mono);
    font-size: 11px;
  }

  nav {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
  }

  nav a {
    padding: 8px 12px;
    border-radius: 8px;
    color: var(--ink-shade);
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
  }

  nav a:hover {
    background: var(--tertiary-normal);
  }

  nav a.on {
    background: var(--tint);
    color: var(--shade);
  }

  .foot {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }

  .who {
    margin: 0;
    overflow: hidden;
    color: var(--tertiary);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shell main {
    min-width: 0;
    padding: 28px var(--gutter) 64px;
  }
</style>
