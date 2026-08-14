<script lang="ts">
  import { card, closeCard } from "$lib/staff.svelte";
  import { destination, HOME, steer } from "$lib/gate";
  import { page } from "$app/state";
  import BottomNav from "$lib/components/shell/BottomNav.svelte";
  import DailyBriefing from "$lib/components/daily/DailyBriefing.svelte";
  import NfcSheet from "$lib/components/tap/NfcSheet.svelte";
  import TapFailedSheet from "$lib/components/tap/TapFailedSheet.svelte";
  import StaffCardSheet from "$lib/components/staff/StaffCardSheet.svelte";
  import TapResultSheet from "$lib/components/tap/TapResultSheet.svelte";
  import TicketSheet from "$lib/components/trade/ticket/TicketSheet.svelte";
  import WarningDialog from "$lib/components/shell/WarningDialog.svelte";
  import Board from "./+page.svelte";
  import Info from "./info/+page.svelte";
  import Leaderboard from "./leaderboard/+page.svelte";
  import Profile from "./profile/+page.svelte";
  import Store from "./store/+page.svelte";
  import { session } from "$lib/auth";
  import { caution, hush } from "$lib/caution.svelte";
  import { celebration, closeCelebration } from "$lib/celebrate.svelte";
  import { briefing, greet } from "$lib/daily.svelte";
  import { currentTab, TABS, tabAt, tabDrift } from "$lib/nav";
  import { goto, onNavigate, preloadCode } from "$app/navigation";
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
  import { permitted } from "$lib/geo";
  import { arm, NfcError, showsSystemSheet } from "$lib/nfc";
  import { warn } from "$lib/notice.svelte";
  import { cancelScan, scanning } from "$lib/scanning.svelte";
  import { handleTap, tapScan } from "$lib/tap";
  import { closeTapFail, tapfail } from "$lib/tapfail.svelte";
  import { hideTicket, ticket } from "$lib/ticket.svelte";
  import { FALLBACK, theme, vars } from "$lib/theme";
  import { active } from "$lib/theme.svelte";

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

  onNavigate((navigation) => {
    const drift = tabDrift(navigation.from?.url.pathname, navigation.to?.url.pathname);
    if (drift === 0 || peeking !== null || !animates()) return;

    const root = document.documentElement;
    root.dataset.slide = drift > 0 ? "forward" : "back";
    root.style.setProperty("--peek", `${shift}px`);
    root.style.setProperty("--slide-ms", `${shift === 0 ? TAP_MS : glide}ms`);

    return new Promise((resolve) => {
      const shown = document.startViewTransition(async () => {
        resolve();
        shift = 0;
        await navigation.complete;
      });

      void shown.finished.finally(() => {
        delete root.dataset.slide;
        root.style.removeProperty("--peek");
        root.style.removeProperty("--slide-ms");
      });
    });
  });

  function report(error: unknown): void {
    if (error instanceof NfcError) warn(error.message);
    else warn("Couldn't register that tap.");
  }

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
  let glide = $state(240);
  let gliding = $state(false);
  let peeking = $state<string | null>(null);

  const Peek = $derived(
    peeking === null ? null : (PANES[peeking as keyof typeof PANES] ?? null),
  );

  $effect(() => {
    const warm = (): void => {
      for (const tab of TABS) void preloadCode(tab.href);
    };
    const idle = window.requestIdleCallback?.(warm);
    const timer = idle === undefined ? setTimeout(warm, 1200) : undefined;

    return () => {
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) clearTimeout(timer);
    };
  });

  function animates(): boolean {
    return (
      typeof document.startViewTransition === "function" &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function rested(): void {
    if (origin === null && shift === 0) peeking = null;
  }

  function settle(vx: number): void {
    if (shift === 0) {
      peeking = null;
      return;
    }

    glide = swipeGlide(Math.abs(shift), vx);
    gliding = true;
    shift = 0;
  }

  function swipeStart(event: Gesture): void {
    origin = swipeFrom(event);
    gliding = false;
    shift = 0;
    peeking = null;
  }

  function swipeMove(event: Gesture): void {
    if (origin === null) return;

    const dx = swipeShift(origin, event);
    if (dx === null) return;

    const step = dx < 0 ? 1 : -1;
    const href = tabAt(page.url.pathname, step);
    if (href !== null && peeking !== href) peeking = href;

    shift = swipePeek(dx, href !== null, window.innerWidth);
  }

  async function swipeEnd(event: Gesture): Promise<void> {
    const from = origin;
    origin = null;
    if (from === null) return;

    const step = swipeCommit(from, event, window.innerWidth);
    const href = step === 0 ? null : tabAt(page.url.pathname, step);
    if (href === null) {
      settle(from.vx);
      return;
    }

    const width = window.innerWidth;
    glide = swipeGlide(width - Math.abs(shift), from.vx);
    gliding = true;
    shift = step > 0 ? -width : width;

    await new Promise((resolve) => setTimeout(resolve, glide));
    await goto(href);
    gliding = false;
    shift = 0;
    peeking = null;
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
  onpointerdown={swipeStart}
  onpointermove={swipeMove}
  onpointerup={(event) => void swipeEnd(event)}
  ontouchstart={swipeStart}
  ontouchmove={swipeMove}
  ontouchend={(event) => void swipeEnd(event)}
  ontouchcancel={() => {
    const vx = origin?.vx ?? 0;
    origin = null;
    settle(vx);
  }}
/>

<div class="shell" {style}>
  <div
    class="stage"
    class:gliding
    style:translate="{shift}px 0"
    style:--glide="{glide}ms"
    ontransitionend={rested}
  >
    <div class="pane">
      {@render children()}
    </div>
    {#if Peek !== null}
      <div class="pane peek" class:before={shift > 0}>
        <Peek />
      </div>
    {/if}
  </div>
  <BottomNav />

  {#if scanning.label !== null && !showsSystemSheet}
    <NfcSheet title={scanning.label} oncancel={cancelScan} />
  {/if}

  {#if celebration.current}
    <TapResultSheet cleared={celebration.current} onclose={closeCelebration} />
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
    max-width: calc(439px + var(--safe-left) + var(--safe-right));
    height: 100dvh;
    margin-inline: auto;
    padding-right: var(--safe-right);
    padding-left: var(--safe-left);
    overflow: hidden;
    background: var(--canvas);
  }

  .stage {
    display: flex;
    flex: 1;
    min-height: 0;
    position: relative;
  }

  .pane {
    display: flex;
    flex: 0 0 100%;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: clip;
  }

  .pane.peek {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 100%;
    width: 100%;
  }

  .pane.peek.before {
    right: 100%;
    left: auto;
  }

  .stage.gliding {
    transition: translate var(--glide, 180ms) cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  @media (prefers-reduced-motion: reduce) {
    .stage.gliding {
      transition: none;
    }
  }
</style>
