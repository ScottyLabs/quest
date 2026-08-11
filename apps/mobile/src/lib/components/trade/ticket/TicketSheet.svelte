<script lang="ts">
  import TicketPass from "./TicketPass.svelte";

  let {
    name,
    andrewId,
    onclose,
  }: { name: string; andrewId: string; onclose: () => void } = $props();
</script>

<svelte:window onkeydown={(event) => event.key === "Escape" && onclose()} />

<div class="scrim" role="presentation" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="sheet"
    role="dialog"
    aria-modal="true"
    aria-label="Terrier Ticket"
    tabindex="-1"
    onclick={(event) => event.stopPropagation()}
  >
    <button class="close" type="button" aria-label="Close ticket" onclick={onclose}>×</button>
    <TicketPass {name} {andrewId} />
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 45;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(30 * var(--u));
    overflow-y: auto;
    -webkit-backdrop-filter: blur(calc(6 * var(--u)));
    backdrop-filter: blur(calc(6 * var(--u)));
    background: rgb(0 0 0 / 0.45);
  }
  .sheet {
    position: relative;
    max-width: 100%;
  }

  .close {
    position: absolute;
    top: calc(-13 * var(--u));
    right: calc(-13 * var(--u));
    z-index: 1;
    display: grid;
    width: calc(36 * var(--u));
    height: calc(36 * var(--u));
    padding: 0 0 calc(3 * var(--u));
    border: 0;
    border-radius: 50%;
    box-shadow: 0 calc(3 * var(--u)) 0 var(--ink-shade);
    background: var(--highlight);
    color: var(--secondary);
    font: inherit;
    font-size: calc(26 * var(--u));
    font-weight: 700;
    line-height: 1;
    place-items: center;
    cursor: pointer;
  }

  .close:active {
    transform: translateY(calc(2 * var(--u)));
    box-shadow: 0 calc(1 * var(--u)) 0 var(--ink-shade);
  }
</style>
