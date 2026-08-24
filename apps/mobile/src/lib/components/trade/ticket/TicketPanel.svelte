<script lang="ts">
  import { PICKUP } from "$lib/trade.svelte";
  import TicketGate from "./TicketGate.svelte";

  let { name, andrewId }: { name: string; andrewId: string } = $props();
</script>

<section class="ticket">
  <p class="lead">
    <strong>Starting on Tuesday, August 25th,</strong> go to the <b>{PICKUP}</b> with ticket below to have your purchased items delivered, <strong>from 10am-4pm.</strong>
  </p>
  <p class="ticket">
    The last day to pick up your Terrier Trade prizes is September 10.
  </p>

  <TicketGate {name} {andrewId} />
</section>

<style>
  .ticket {
    width: calc(369 * var(--u));
    max-width: 100%;
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
</style>
