<script lang="ts">
  import ClaimedCard from "$lib/components/store/ClaimedCard.svelte";
  import OfferCard from "$lib/components/store/OfferCard.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import PagerDots from "$lib/components/ui/PagerDots.svelte";
  import ScottyCoin from "$lib/components/ui/ScottyCoin.svelte";
  import { MEDIA_BOX, STEPS } from "$lib/onboarding";

  let {
    cta,
    onfinish,
    label = "Onboarding",
  }: {
    cta: string;
    onfinish: () => void;
    label?: string;
  } = $props();

  let index = $state(0);
  const step = $derived(STEPS[index]);
  const last = $derived(index === STEPS.length - 1);

  function next() {
    if (last) onfinish();
    else index += 1;
  }

  function back() {
    if (index > 0) index -= 1;
  }

  const SWIPE_MIN = 48;
  let swipeFrom: { x: number; y: number } | null = null;

  function swipeStart(event: PointerEvent) {
    swipeFrom = { x: event.clientX, y: event.clientY };
  }

  function swipeEnd(event: PointerEvent) {
    const from = swipeFrom;
    swipeFrom = null;
    if (!from) return;

    const dx = event.clientX - from.x;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(event.clientY - from.y)) return;

    if (dx < 0) {
      if (!last) index += 1;
    } else {
      back();
    }
  }
</script>

<div
  class="screen"
  role="group"
  aria-roledescription="carousel"
  aria-label={label}
  onpointerdown={swipeStart}
  onpointerup={swipeEnd}
  onpointercancel={() => (swipeFrom = null)}
  ondragstart={(event) => event.preventDefault()}
>
  {#if step}
    <div class="topbar">
      <button class="arrow" onclick={back} disabled={index === 0} aria-label="Back">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path
            d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <button class="skip" onclick={onfinish}>Skip</button>
    </div>

    <div class="hero">
      <div class="media">
        {#if step.media.kind === "coin"}
          <ScottyCoin size={MEDIA_BOX} />
        {:else if step.media.kind === "offer"}
          <OfferCard
            name={step.media.name}
            cost={step.media.cost}
            claimed={step.media.claimed}
            stock={step.media.stock}
            art={step.media.art}
          />
        {:else if step.media.kind === "claim"}
          <ClaimedCard name={step.media.name} progress={step.media.progress} />
        {:else}
          <img src={step.media.src} alt="" width={step.media.size} height={step.media.size} />
        {/if}
      </div>

      <div class="copy">
        <h1>{step.title}</h1>
        <p>
          {#each step.body as part (part.text)}
            {#if part.strong}<strong>{part.text}</strong>{:else}{part.text}{/if}
          {/each}
        </p>
      </div>

      <PagerDots count={STEPS.length} active={index} />
    </div>

    <div class="actions">
      <Button onclick={next}>{last ? cta : "Next"}</Button>
    </div>
  {/if}
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    padding: calc(27px + var(--safe-top)) calc(16px + var(--safe-right))
      max(14px, var(--safe-bottom)) calc(16px + var(--safe-left));
    background: var(--highlight);
    /* let vertical gestures through, keep horizontal ones for the carousel */
    touch-action: pan-y;
    user-select: none;
  }

  .hero {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 48px;
  }

  .topbar {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    height: 24px;
  }

  .arrow {
    display: grid;
    padding: 0;
    border: 0;
    background: none;
    color: var(--secondary);
    cursor: pointer;
    place-items: center;
  }

  .arrow:disabled {
    visibility: hidden;
  }

  .skip {
    padding: 0;
    border: 0;
    background: none;
    color: var(--muted);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.26px;
    text-decoration: underline;
    cursor: pointer;
  }

  /* fixed slots: the media, heading and dots must not move between steps */
  .media {
    display: grid;
    flex: none;
    place-items: center;
    width: 100%;
    height: 163px;
  }

  .media :global(img) {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    /* a native image drag swallows the pointerup that ends a swipe */
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  .copy {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    height: 98px;
    text-align: center;
  }

  h1 {
    margin: 0;
    font-size: 19px;
    font-weight: 400;
    letter-spacing: 0.15px;
  }

  p {
    max-width: 343px;
    margin: 0;
    color: var(--primary-light);
    font-size: 15px;
    font-weight: 600;
  }

  strong {
    font-weight: 800;
  }

  .actions {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }
</style>
