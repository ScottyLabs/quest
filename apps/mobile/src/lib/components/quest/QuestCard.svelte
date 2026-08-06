<script lang="ts">
  import CoinAmount from "./CoinAmount.svelte";
  import { theme } from "$lib/theme";
  import type { Quest } from "$lib/quests.svelte";

  let { quest, onclaim }: { quest: Quest; onclaim?: (id: string) => void } = $props();

  const tile = $derived(theme(quest.category).accent);
</script>

{#if quest.state === "done"}
  <article class="card done">
    <img class="badge" src="/img/quest/badge-done.svg" alt="Completed" width="54" height="49" />
    <h2>{quest.title}</h2>
  </article>
{:else}
  <article class="card open">
    <div class="art" style:background={tile}></div>

    <div class="copy">
      <h2>{quest.title}</h2>
      <p>{quest.detail}</p>
    </div>

    <div class="reward">
      <CoinAmount amount={quest.reward} />
      <button aria-label="Complete {quest.title}" onclick={() => onclaim?.(quest.id)}>
        <img src="/img/quest/check.svg" alt="" width="52" height="45" />
      </button>
    </div>
  </article>
{/if}

<style>
  .card {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 76px;
    border-radius: 18px;
  }

  .done {
    gap: 14px;
    padding: 0 14px;
    background: var(--quest-done);
  }

  .done h2 {
    margin: 0;
    color: var(--quest-done-ink);
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.34px;
    text-decoration: line-through;
  }

  .badge {
    flex: none;
  }

  .open {
    gap: 10px;
    padding: 0 8px 0 14px;
    background: var(--highlight);
  }

  .art {
    display: grid;
    flex: none;
    width: 48px;
    height: 45px;
    border-radius: 11px;
    overflow: clip;
    place-items: center;
    rotate: -7.54deg;
  }

  .copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .copy h2 {
    margin: 0;
    color: var(--secondary);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.28px;
  }

  .copy p {
    margin: 0;
    color: var(--tertiary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.22px;
  }

  .reward {
    display: flex;
    flex: none;
    align-items: center;
    gap: 2px;
  }

  .reward button {
    display: grid;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    place-items: center;
  }
</style>
