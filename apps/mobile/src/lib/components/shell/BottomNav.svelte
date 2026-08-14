<script lang="ts">
  import { page } from "$app/state";
  import { currentTab, TABS } from "$lib/nav";

  const active = $derived(currentTab(page.url.pathname));
</script>

<div class="dock" class:scrim={active?.scrim}>
  <nav aria-label="Main">
    <div class="marks">
      {#each TABS as tab (tab.href)}
        {@const on = tab === active}
        {@const [w, h] = on ? tab.activeBox : tab.box}
        <a
          href={tab.href}
          aria-current={on ? "page" : undefined}
          aria-label={tab.label}
          style:--slot="{tab.box[0]}px"
        >
          <img src={on ? tab.activeIcon : tab.icon} alt="" width={w} height={h} />
        </a>
      {/each}
    </div>
  </nav>
</div>

<style>
  .dock {
    position: fixed;
    view-transition-name: dock;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: center;
    padding: 126px calc(16px + var(--safe-right)) var(--dock-gap)
      calc(16px + var(--safe-left));
    pointer-events: none;
  }

  .dock.scrim {
    background: linear-gradient(180deg, transparent 1.56%, var(--shade) 123%);
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
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 26px;
    padding: 0 20px;
  }

  /* pinned to the resting width so growth on selection can't shove neighbours */
  a {
    position: relative;
    flex: none;
    width: var(--slot);
    height: 40px;
  }

  /* overlay only, so a 44px target never feeds back into layout */
  a::after {
    content: "";
    position: absolute;
    inset: -2px -12px;
  }

  img {
    position: absolute;
    top: 50%;
    left: 50%;
    object-fit: contain;
    translate: -50% -50%;
  }
</style>
