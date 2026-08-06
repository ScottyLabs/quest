<script lang="ts">
  import { page } from "$app/state";
  import { currentTab, TABS } from "$lib/nav";

  const active = $derived(currentTab(page.url.pathname));
</script>

<div class="dock">
  <nav aria-label="Main">
    <div class="marks">
      {#each TABS as tab (tab.href)}
        {@const on = tab === active}
        {@const [w, h] = on ? tab.activeBox : tab.box}
        <a href={tab.href} aria-current={on ? "page" : undefined} aria-label={tab.label}>
          <img src={on ? tab.activeIcon : tab.icon} alt="" width={w} height={h} />
        </a>
      {/each}
    </div>
  </nav>
</div>

<style>
  .dock {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: center;
    padding: 126px 16px 32px;
    background: linear-gradient(180deg, transparent 1.56%, var(--shade) 123%);
    pointer-events: none;
  }

  nav {
    position: relative;
    width: 100%;
    max-width: 353px;
    height: 62px;
    border-radius: 37px;
    background: var(--accent);
    pointer-events: auto;
    translate: -1px;
  }

  .marks {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 33.35px;
    display: flex;
    align-items: center;
    gap: 40px;
    padding: 0 20px;
  }

  a {
    display: grid;
    place-items: center;
  }

  img {
    object-fit: contain;
  }
</style>
