<script lang="ts">
  let {
    name,
    progress,
    onscan,
  }: {
    name: string;
    /** [done, total] */
    progress: [number, number];
    onscan?: () => void;
  } = $props();

  const [done, total] = $derived(progress);
  const pct = $derived(total === 0 ? 0 : Math.min(Math.max(done / total, 0), 1) * 100);
</script>

<article>
  <img class="seal" src="/img/store/claimed-seal.svg" alt="" width="58" height="56" />

  <div class="detail">
    <h2>{name}</h2>

    <div
      class="bar"
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin="0"
      aria-valuemax={total}
      aria-label="{name} claimed"
    >
      <span class="fill" style:width="{pct}%"></span>
      <span class="tally">{done}/{total}</span>
    </div>
  </div>

  <button type="button" onclick={onscan} aria-label="Scan to claim {name}">
    <img src="/img/store/qr.svg" alt="" width="36" height="36" />
  </button>
</article>

<style>
  article {
    display: flex;
    align-items: center;
    gap: 18px;
    width: 100%;
    max-width: 357px;
    padding: 15px 13px 17px 18px;
    border-radius: 20px;
    background: #dbebdb;
  }

  .seal {
    flex: none;
    width: 58px;
    height: 56px;
  }

  .detail {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  h2 {
    margin: 0;
    color: var(--quest-done-ink);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.4px;
    text-decoration: line-through;
  }

  .bar {
    position: relative;
    display: grid;
    height: 18px;
    border-radius: 9px;
    background: #3a3a3a;
    place-items: center;
  }

  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    border-radius: 9px;
    background: var(--quest-done-ink);
  }

  .tally {
    position: relative;
    color: #dbebdb;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.32px;
  }

  button {
    display: grid;
    flex: none;
    width: 50px;
    height: 44px;
    margin-bottom: 6px;
    padding: 0;
    border: 2px solid var(--quest-done-ink);
    border-radius: 12px;
    background: #f0f0f0;
    box-shadow: 0 6px 0 0 var(--quest-done-ink);
    cursor: pointer;
    place-items: center;
  }

  button:active {
    margin-top: 6px;
    margin-bottom: 0;
    box-shadow: 0 0 0 0 var(--quest-done-ink);
  }

  button img {
    width: 36px;
    height: 36px;
  }
</style>
