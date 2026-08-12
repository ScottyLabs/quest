<script lang="ts">
  import { goto } from "$app/navigation";
  import InfoFrame from "$lib/components/info/InfoFrame.svelte";
  import { openExternal } from "$lib/external";
  import { INFO_TILES, UPDATED } from "$lib/info";

  /** relative stays in-app, absolute goes to the system browser */
  function follow(url: string): void {
    if (url.startsWith("/")) void goto(url);
    else void openExternal(url);
  }
</script>

<svelte:head><title>Information - Orientation Quest</title></svelte:head>

<InfoFrame
  title="Information Page"
  subtitle="Last updated {UPDATED}"
  crest="/img/info/crest.svg"
>
  <ul class="tiles">
    {#each INFO_TILES as tile (tile.id)}
      <li>
        <button class="tile" type="button" onclick={() => follow(tile.url)}>
          <img src={tile.icon} alt="" width="76" height="76" />
          <span>{tile.label}</span>
        </button>
      </li>
    {/each}
  </ul>
</InfoFrame>

<style>
  .tiles {
    display: grid;
    grid-template-columns: repeat(2, calc(150 * var(--u)));
    justify-content: center;
    gap: calc(44 * var(--u)) calc(48 * var(--u));
    margin: 0;
    padding: calc(42 * var(--u)) 0 var(--dock-clear);
    list-style: none;
  }

  /* a lone trailing tile (odd count) centres across both columns */
  .tiles li:last-child:nth-child(odd) {
    grid-column: 1 / -1;
    justify-self: center;
  }

  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: calc(3 * var(--u));
    width: calc(150 * var(--u));
    height: calc(150 * var(--u));
    padding: calc(9 * var(--u)) 0 0;
    border: 0;
    border-radius: calc(17 * var(--u));
    background: var(--highlight);
    box-shadow: 0 0 calc(16.8 * var(--u)) rgb(0 0 0 / 20%);
    color: var(--secondary);
    font-family: inherit;
    cursor: pointer;
  }

  .tile:active {
    background: color-mix(in srgb, var(--highlight) 94%, #000000);
  }

  .tile img {
    width: calc(76 * var(--u));
    height: calc(76 * var(--u));
  }

  .tile span {
    font-size: calc(15 * var(--u));
    font-style: italic;
    letter-spacing: calc(0.3 * var(--u));
  }
</style>
