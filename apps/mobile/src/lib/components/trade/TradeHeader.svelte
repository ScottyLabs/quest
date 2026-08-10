<script lang="ts">
  let { balance }: { balance: number } = $props();
</script>

<div class="brand">
  <img class="logo" src="/img/trade/logo.svg" alt="" />
  <h1>Terrier<br />Trade</h1>
</div>

<div class="purse">
  <img class="badge-back" src="/img/trade/badge-shadow.svg" alt="" />
  <img class="badge" src="/img/trade/badge-face.svg" alt="" />
  <img class="coin" src="/img/trade/coin-lg.svg" alt="" />
  <p class="tally">{balance}</p>
</div>

<style>
  .brand {
    position: absolute;
    z-index: 2;
    top: calc(55 * var(--u) + var(--notch));
    left: calc(21 * var(--u));
    display: flex;
    align-items: flex-end;
    gap: calc(12 * var(--u));
  }

  .logo {
    display: block;
    flex: none;
    width: calc(99 * var(--u));
    height: calc(99 * var(--u));
  }

  h1 {
    margin: 0 0 calc(9 * var(--u));
    color: var(--highlight);
    font-size: calc(32 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.64 * var(--u));
    line-height: 1.15;
  }

  .purse img,
  .tally {
    position: absolute;
    z-index: 2;
  }

  .badge-back {
    bottom: calc(140.7 * var(--u));
    left: calc(272.86 * var(--u));
    width: calc(189.64 * var(--u));
    height: calc(298.834 * var(--u));
  }

  .badge {
    bottom: calc(155.556 * var(--u));
    left: calc(262.78 * var(--u));
    width: calc(184.718 * var(--u));
    height: calc(298.444 * var(--u));
  }

  .coin {
    top: calc(60.5 * var(--u) + var(--notch));
    left: calc(283 * var(--u));
    width: calc(59 * var(--u));
    height: calc(61 * var(--u));
  }

  .tally {
    top: calc(68.5 * var(--u) + var(--notch));
    left: calc(345 * var(--u));
    margin: 0;
    color: #fdf8f8;
    font-size: calc(40 * var(--u));
    font-style: italic;
    font-weight: 600;
    font-stretch: 75%;
    letter-spacing: calc(0.8 * var(--u));
    text-shadow: 0 calc(5 * var(--u)) 0 rgb(0 0 0 / 25%);
  }
</style>
