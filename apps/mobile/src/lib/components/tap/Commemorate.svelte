<script lang="ts">
  import ChallengeNote from "./ChallengeNote.svelte";
  import { commemorate } from "$lib/commemorations";

  let { challengeId, title, reward }: { challengeId: string; title: string; reward: number } =
    $props();

  let copied = $state(false);
  let busy = $state(false);

  const line = $derived(
    [
      `🏆 Just cleared "${title}" on CMU Orientation Quest!`,
      `🪙 +${reward} ScottyCoins, and Carnegie Cup for my housing community.`,
      `🐕 Think you can catch up? https://cmu.lol/quest`,
    ].join("\n"),
  );

  async function shoot(): Promise<void> {
    if (busy) return;
    busy = true;
    await commemorate(challengeId).catch(() => {});
    busy = false;
  }

  async function send(): Promise<void> {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "CMU Orientation Quest", text: line }).catch(() => {});
      return;
    }

    try {
      await navigator.clipboard.writeText(line);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
    }
  }
</script>

<p class="label">Commemorate it</p>

<ChallengeNote {challengeId} />

<div class="acts">
  <button class="fill" type="button" disabled={busy} onclick={shoot}>Take a photo</button>
  <button class="ghost" type="button" onclick={send}>
    {copied ? "Copied" : "Share with a friend"}
  </button>
</div>

<style>
  .label {
    margin: 0 0 calc(10 * var(--u));
    color: var(--tertiary);
    font-size: calc(12 * var(--u));
    font-weight: 700;
    letter-spacing: calc(1.1 * var(--u));
    text-align: center;
    text-transform: uppercase;
  }

  .acts {
    display: flex;
    gap: calc(10 * var(--u));
  }

  .fill,
  .ghost {
    flex: 1;
    height: calc(48 * var(--u));
    border-radius: calc(24 * var(--u));
    font: inherit;
    font-size: calc(15 * var(--u));
    font-weight: 700;
    cursor: pointer;
  }

  .fill {
    border: 0;
    background: var(--accent);
    color: var(--highlight);
  }

  .fill:active {
    filter: brightness(0.94);
  }

  .fill:disabled {
    opacity: 0.6;
  }

  .ghost {
    border: calc(2 * var(--u)) solid var(--accent);
    background: none;
    color: var(--accent);
  }
</style>
