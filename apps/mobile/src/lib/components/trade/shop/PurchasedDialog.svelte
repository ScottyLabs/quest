<script lang="ts">
  import { PICKUP, type Bought } from "$lib/trade.svelte";

  let {
    bought,
    pickup = PICKUP,
    onclose,
  }: { bought: Bought; pickup?: string; onclose: () => void } = $props();
</script>

<div class="scrim" role="presentation" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="card"
    role="alertdialog"
    aria-modal="true"
    aria-label="Purchased"
    tabindex="-1"
    onclick={(event) => event.stopPropagation()}
  >
    <div class="crest">
      <span class="burst">
        <img class="star" src="/img/trade/purchased-burst.svg" alt="" />
        <img class="tick" src="/img/trade/purchased-check.svg" alt="" />
      </span>

      <div class="copy">
        <h2>Purchased!</h2>
        <p class="body">
          You bought <span class="hot">{bought.quantity} {bought.name}!</span> You can see your
          prizes in your <span class="hot loud">RECEIPT.</span> In order to claim your prize, go to
          <span class="hot">{pickup}</span> with <span class="hot">ticket</span> to have prize delivered
        </p>
      </div>
    </div>

    <button class="go" type="button" onclick={onclose}>Continue</button>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 35;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(24 * var(--u));
    background: rgb(0 0 0 / 0.55);
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(51 * var(--u));
    width: calc(375 * var(--u));
    max-width: 100%;
    max-height: 100%;
    padding: calc(76 * var(--u)) calc(16 * var(--u));
    overflow-y: auto;
    border-radius: calc(20 * var(--u));
    background: var(--highlight);
  }

  .crest {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(13 * var(--u));
    width: calc(283 * var(--u));
    max-width: 100%;
  }

  .burst {
    position: relative;
    display: block;
    flex: none;
    width: calc(191 * var(--u));
    height: calc(187 * var(--u));
  }

  .star {
    display: block;
    width: 100%;
    height: 100%;
  }

  .tick {
    position: absolute;
    top: calc(62.97 * var(--u));
    left: calc(62.32 * var(--u));
    display: block;
    width: calc(66.9613 * var(--u));
    height: calc(62.7734 * var(--u));
  }

  .copy {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(3 * var(--u));
    width: 100%;
  }

  h2 {
    margin: 0;
    color: var(--secondary);
    font-size: calc(40 * var(--u));
    font-weight: 800;
    letter-spacing: calc(0.8 * var(--u));
    text-align: center;
  }

  .body {
    width: calc(254 * var(--u));
    max-width: 100%;
    margin: 0;
    color: var(--muted);
    font-size: calc(13 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.26 * var(--u));
  }

  .hot {
    color: var(--accent);
  }

  .loud {
    font-size: calc(15 * var(--u));
  }

  .go {
    width: calc(302 * var(--u));
    max-width: 100%;
    height: calc(48 * var(--u));
    padding: calc(12 * var(--u)) calc(32 * var(--u));
    border: 0;
    border-radius: calc(24 * var(--u));
    background: var(--accent);
    color: var(--highlight);
    font: inherit;
    font-size: calc(16 * var(--u));
    font-weight: 700;
    line-height: calc(24 * var(--u));
    filter: drop-shadow(0 calc(4 * var(--u)) 0 #360101);
    cursor: pointer;
  }

  .go:active {
    filter: brightness(0.94);
  }
</style>
