<script lang="ts">
  import qrcode from "qrcode-generator";
  import { passToken } from "$lib/pass";
  import PassField from "./PassField.svelte";

  let {
    name,
    andrewId,
    token,
  }: { name: string; andrewId: string; token?: string } = $props();

  let drawn = $state("");
  let failed = $state(false);

  $effect(() => {
    let live = true;

    void (async () => {
      try {
        const payload = token ?? (await passToken());
        const matrix = qrcode(0, "M");
        matrix.addData(payload);
        matrix.make();
        const svg = matrix.createSvgTag({ cellSize: 1, margin: 0, scalable: true });
        if (live) drawn = svg;
      } catch (error) {
        console.error("ticket", error);
        if (live) failed = true;
      }
    })();

    return () => {
      live = false;
    };
  });
</script>

<article class="pass">
  <header>
    <img class="badge" src="/img/trade/ticket-badge.png" alt="" />
    <h2>Terrier Ticket</h2>
  </header>

  <img class="tartan" src="/img/trade/ticket-tartan.png" alt="" />

  <div class="strip">
    <div class="fields">
      <PassField label="Name" value={name} />
      <PassField label="Andrew ID" value={andrewId} />
    </div>
  </div>

  <div class="qr" role="img" aria-label="Ticket QR code">
    {#if drawn}
      {@html drawn}
    {:else}
      <span class="pending">{failed ? "Ticket unavailable" : "Loading..."}</span>
    {/if}
  </div>
  <img class="scotty" src="/img/trade/ticket-scotty.png" alt="" />
</article>

<style>
  .pass {
    position: relative;
    width: calc(365 * var(--u));
    margin-inline: auto;
    overflow: hidden;
    border-radius: calc(10 * var(--u));
    box-shadow: 0 calc(9 * var(--u)) 0 var(--ink-shade);
    background: #d9d9d9;
  }

  header {
    display: flex;
    align-items: center;
    gap: calc(10 * var(--u));
    height: calc(74 * var(--u));
    padding-left: calc(13 * var(--u));
    background: #d0d0d0;
  }

  .badge {
    display: block;
    width: calc(48 * var(--u));
    height: calc(48 * var(--u));
  }

  h2 {
    margin: 0;
    color: var(--secondary);
    font-size: calc(24 * var(--u));
    font-weight: 700;
  }

  .tartan {
    display: block;
    width: 100%;
    height: calc(92 * var(--u));
    object-fit: cover;
  }

  .strip {
    margin: calc(19 * var(--u)) calc(15 * var(--u)) 0;
    padding: calc(6 * var(--u)) calc(10 * var(--u));
    border-radius: calc(10 * var(--u));
    background: var(--highlight);
  }

  .fields {
    display: grid;
    grid-template-columns: calc(171 * var(--u)) 1fr;
    align-content: center;
    height: calc(50 * var(--u));
    padding-inline: calc(6 * var(--u));
    border-radius: calc(6 * var(--u));
    background: var(--tertiary-normal);
  }

  .qr {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    width: calc(212 * var(--u));
    height: calc(212 * var(--u));
    margin: calc(34 * var(--u)) auto calc(17 * var(--u));
    padding: calc(10 * var(--u));
    border-radius: calc(6 * var(--u));
    background: #fff;
  }

  .qr :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
    shape-rendering: crispEdges;
  }

  .pending {
    color: var(--tertiary);
    font-size: calc(13 * var(--u));
    font-weight: 600;
  }

  .scotty {
    position: absolute;
    bottom: calc(17 * var(--u));
    left: calc(15 * var(--u));
    width: calc(32 * var(--u));
    height: calc(28 * var(--u));
  }
</style>
