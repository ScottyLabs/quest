<script lang="ts">
  import TicketGate from "./TicketGate.svelte";
  import TicketPass from "./TicketPass.svelte";
  import { PICKUP } from "$lib/trade.svelte";

  let { name, andrewId }: { name: string; andrewId: string } = $props();

  let shown = $state(false);
</script>

<section class="ticket">
  <p class="lead">
    Go to the <b>{PICKUP}</b> with ticket below to have&nbsp;
    <b class="mark">ITEMS BOUGHT</b>
    be <b class="mark">DELIVERED</b>
  </p>

  {#if shown}
    <TicketPass {name} {andrewId} />
  {:else}
    <TicketGate onreveal={() => (shown = true)} />
  {/if}
</section>

<style>
  .ticket {
    width: calc(369 * var(--u));
    margin-inline: auto;
    padding-top: calc(35 * var(--u));
  }

  .lead {
    margin: 0 0 calc(19 * var(--u));
    color: var(--secondary);
    font-size: calc(16 * var(--u));
    font-weight: 400;
    letter-spacing: calc(0.32 * var(--u));
  }

  .lead b {
    font-weight: 700;
  }

  .mark {
    text-decoration: underline;
    text-decoration-skip-ink: none;
    text-underline-position: from-font;
  }
</style>
