<script lang="ts">
  import { goto, onNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import {
      announcement,
      closeAnnouncement,
      showAnnouncementOnce,
  } from "$lib/announcement.svelte";
  import { session } from "$lib/auth";
  import { caution, hush } from "$lib/caution.svelte";
  import { celebration, closeCelebration } from "$lib/celebrate.svelte";
  import DailyBriefing from "$lib/components/daily/DailyBriefing.svelte";
  import BottomNav from "$lib/components/shell/BottomNav.svelte";
  import WarningDialog from "$lib/components/shell/WarningDialog.svelte";
  import StaffCardSheet from "$lib/components/staff/StaffCardSheet.svelte";
  import NfcSheet from "$lib/components/tap/NfcSheet.svelte";
  import TapFailedSheet from "$lib/components/tap/TapFailedSheet.svelte";
  import TapResultSheet from "$lib/components/tap/TapResultSheet.svelte";
  import RefundDialog from "$lib/components/trade/receipt/RefundDialog.svelte";
  import ItemSheet from "$lib/components/trade/shop/ItemSheet.svelte";
  import PurchasedDialog from "$lib/components/trade/shop/PurchasedDialog.svelte";
  import TicketSheet from "$lib/components/trade/ticket/TicketSheet.svelte";
  import { briefing, greet } from "$lib/daily.svelte";
  import { destination, HOME, steer } from "$lib/gate";
  import { permitted } from "$lib/geo";
  import { currentTab, tabAt, TABS } from "$lib/nav";
  import { arm, NfcError, showsSystemSheet } from "$lib/nfc";
  import { warn } from "$lib/notice.svelte";
  import { cancelScan, scanning } from "$lib/scanning.svelte";
  import { card, closeCard } from "$lib/staff.svelte";
  import {
      swipeCommit,
      swipeFrom,
      swipeGlide,
      swipePeek,
      swipeShift,
      TAP_MS,
      type Gesture,
      type Origin,
  } from "$lib/swipe";
  import { handleTap, tapScan } from "$lib/tap";
  import { closeTapFail, tapfail } from "$lib/tapfail.svelte";
  import { FALLBACK, theme, vars } from "$lib/theme";
  import { active } from "$lib/theme.svelte";
  import { hideTicket, ticket } from "$lib/ticket.svelte";
  import {
      closeBought,
      closeOffer,
      closeRefund,
      sheet,
      showBought,
  } from "$lib/trade.svelte";
  import { me } from "$lib/user.svelte";
  import { refresh, wallet } from "$lib/wallet.svelte";
  import Board from "./+page.svelte";
  import Info from "./info/+page.svelte";
  import Leaderboard from "./leaderboard/+page.svelte";
  import Profile from "./profile/+page.svelte";
  import Store from "./store/+page.svelte";

  let { children } = $props();

  const PANES = {
    "/app": Board,
    "/app/info": Info,
    "/app/leaderboard": Leaderboard,
    "/app/profile": Profile,
    "/app/store": Store,
  };

  const board = $derived(currentTab(page.url.pathname)?.href === "/app");
  const style = $derived(vars(theme(board ? active.id : FALLBACK)));

  onNavigate(() => {
    if (flung) flung = false;
    else glide = TAP_MS;
  });

  function report(error: unknown): void {
    if (error instanceof NfcError) warn(error.message);
    else warn("Couldn't register that tap.");
  }

  $effect(() => {
    if (session.phase === "signedIn") {
        showAnnouncementOnce();
    }
});

  async function retryLocation(): Promise<void> {
    if (await permitted()) hush();
  }

  async function retryTap(): Promise<void> {
    const url = tapfail.current?.url ?? null;
    closeTapFail();
    await tapScan("challenge", url).catch(report);
  }

  let origin: Origin | null = null;
  let shift = $state(0);
  let glide = $state(TAP_MS);
  let dragging = $state(false);
  let pending = $state<number | null>(null);
  let flung = false;
  let stage = $state<HTMLElement | null>(null);

  function span(): number {
    return stage?.clientWidth ?? window.innerWidth;
  }

  const here = $derived(page.url.pathname);
  const at = $derived(TABS.findIndex((tab) => tab.href === here));
  const slot = $derived(pending ?? at);

  $effect(() => {
    const tab = currentTab(here);
    if (tab !== null) document.title = `${tab.label} - Orientation Quest`;
  });

  function mouse(event: PointerEvent): boolean {
    return event.pointerType !== "touch";
  }

  function still(): boolean {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function settle(): void {
    dragging = false;
    if (shift === 0) return;

    glide = swipeGlide(shift, span());
    shift = 0;
  }

  function swipeStart(event: Gesture): void {
    origin = swipeFrom(event);
  }

  function swipeMove(event: Gesture): void {
    if (origin === null || still()) return;

    const dx = swipeShift(origin, event);
    if (dx === null) return;

    dragging = true;

    const step = dx < 0 ? 1 : -1;
    const open = tabAt(here, step) !== null;
    shift = swipePeek(dx, open, span());
  }

  async function swipeEnd(event: Gesture): Promise<void> {
    const from = origin;
    origin = null;
    if (from === null) return;

    const step = swipeCommit(from, event, span());
    const href = step === 0 ? null : tabAt(here, step);
    if (href === null) {
      settle();
      return;
    }

    const reach = span();
    glide = swipeGlide(reach - Math.abs(shift), reach);
    flung = true;
    pending = at + step;
    dragging = false;
    shift = 0;

    await goto(href);
    pending = null;
  }

  $effect(() => steer(HOME));

  $effect(() => {
    if (destination() === HOME) greet();
  });

  $effect(() => {
    if (session.phase !== "signedIn") return;

    let disarm: (() => void) | null = null;
    let dropped = false;

    void arm((url) => void handleTap(url).catch(report)).then(
      (off) => (dropped ? off() : (disarm = off)),
    );

    return () => {
      dropped = true;
      disarm?.();
    };
  });
</script>

<svelte:window
  onpointerdown={(event) => mouse(event) && swipeStart(event)}
  onpointermove={(event) => mouse(event) && swipeMove(event)}
  onpointerup={(event) => {
    if (mouse(event)) void swipeEnd(event);
  }}
  ontouchstart={swipeStart}
  ontouchmove={swipeMove}
  ontouchend={(event) => void swipeEnd(event)}
  ontouchcancel={() => {
    origin = null;
    settle();
  }}
/>

<div class="shell" {style}>
  {#if at === -1}
    <div class="pane solo">
      {@render children()}
    </div>
  {:else}
    <div
      bind:this={stage}
      class="stage"
      class:dragging
      style:--at={slot}
      style:--shift="{shift}px"
      style:--glide="{glide}ms"
    >
      {#each TABS as tab, index (tab.href)}
        {@const Tab = PANES[tab.href as keyof typeof PANES]}
        <div
          class="pane"
          class:far={Math.abs(index - slot) > 1}
          inert={index !== at && !dragging}
        >
          <Tab />
        </div>
      {/each}
    </div>
  {/if}
  <BottomNav />
<!-- TEMP ANNOUNCEMENT -->
{#if announcement.open && !briefing.open}
  <WarningDialog
    title="Terrier Trade Update"
    body="Terrier Trade will open at noon on Wed 08/19. We're sorry for the delay!"
    dismiss="Yippee!"
    ondismiss={closeAnnouncement}
  />
{/if}

  {#if scanning.label !== null && !showsSystemSheet}
    <NfcSheet title={scanning.label} oncancel={cancelScan} />
  {/if}

  {#if celebration.current}
    <TapResultSheet cleared={celebration.current} onclose={closeCelebration} />
  {/if}

  {#if sheet.picked}
    <ItemSheet
      offer={sheet.picked}
      balance={wallet.scottycoins}
      player={me.current?.player ?? false}
      onclose={closeOffer}
      onbought={(done) => {
        showBought(done);
        void refresh();
      }}
    />
  {/if}

  {#if sheet.bought}
    <PurchasedDialog bought={sheet.bought} onclose={closeBought} />
  {/if}

  {#if sheet.refunding}
    <RefundDialog
      row={sheet.refunding}
      onclose={closeRefund}
      ondone={() => {
        closeRefund();
        void refresh();
      }}
    />
  {/if}

  {#if ticket.current}
    <TicketSheet
      name={ticket.current.name}
      andrewId={ticket.current.andrewId}
      onclose={hideTicket}
    />
  {/if}

  {#if card.current}
    <StaffCardSheet card={card.current} from={card.from} onclose={closeCard} />
  {/if}

  {#if tapfail.current}
    <TapFailedSheet fail={tapfail.current} onretry={retryTap} onclose={closeTapFail} />
  {/if}

  {#if caution.current}
    <WarningDialog
      title={caution.current.title}
      body={caution.current.body}
      onconfirm={retryLocation}
      ondismiss={hush}
    />
  {/if}

  {#if briefing.open}
    <DailyBriefing />
  {/if}
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100dvh;
    margin-inline: auto;
    padding-right: var(--safe-right);
    padding-left: var(--safe-left);
    overflow: clip;
    background: var(--canvas);
  }

  .stage {
    display: flex;
    flex: 1;
    min-height: 0;
    transform: translate3d(calc(var(--at) * -100% + var(--shift)), 0, 0);
    transition: transform var(--glide, 220ms) cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  .stage.dragging {
    transition: none;
    will-change: transform;
  }

  .pane {
    display: flex;
    flex: 0 0 100%;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: clip;
  }

  .pane.far {
    content-visibility: hidden;
  }

  .pane.solo {
    flex: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .stage {
      transition: none;
    }
  }
</style>
