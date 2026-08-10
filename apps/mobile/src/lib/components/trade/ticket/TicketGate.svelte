<script lang="ts">
  import { Capacitor } from "@capacitor/core";
  import { warn } from "$lib/notice.svelte";
  import { addAppleToWallet } from "$lib/pass";

  let { onreveal }: { onreveal: () => void } = $props();

  let busy = $state(false);

  async function show(): Promise<void> {
    if (busy) return;
    busy = true;

    try {
      if (Capacitor.getPlatform() === "ios") {
        await addAppleToWallet();
        return;
      }
      onreveal();
    } catch (error) {
      console.error("pass", error);
      warn(`Couldn't open your pass (${error instanceof Error ? error.message : "unknown"}).`);
    } finally {
      busy = false;
    }
  }
</script>

<div class="gate">
  <button class="reveal" type="button" onclick={show} disabled={busy}>
    {busy ? "Preparing pass..." : "Click to Show Pass"}
  </button>
  <img class="placeholder" src="/img/trade/ticket-pass-placeholder.svg" alt="" />
</div>

<style>
  .gate {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .reveal {
    width: 100%;
    height: calc(48 * var(--u));
    padding: 0 calc(32 * var(--u));
    border: 0;
    border-radius: calc(24 * var(--u));
    box-shadow: calc(2.5 * var(--u)) calc(4.5 * var(--u)) 0 calc(-2.5 * var(--u)) var(--band);
    background: var(--accent);
    color: var(--highlight);
    font: inherit;
    font-size: calc(16 * var(--u));
    font-weight: 700;
    line-height: calc(24 * var(--u));
    cursor: pointer;
  }

  .placeholder {
    display: block;
    width: calc(313.5 * var(--u));
    height: calc(305.5 * var(--u));
    margin-top: calc(54 * var(--u));
  }
</style>
