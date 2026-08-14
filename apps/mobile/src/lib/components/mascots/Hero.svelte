<script lang="ts">
  import { ART_BOX, type Mascot } from "$lib/mascots";

  let { mascot = null }: { mascot?: Mascot | null } = $props();
</script>

<div class="hero">
  <div class="art" style:max-height="{ART_BOX}px">
    <img src="/img/mascots/hero/{mascot?.slug ?? 'scotty'}.svg" alt="" />
  </div>

  {#if mascot}
    <h1>{mascot.name}</h1>
    <p class="quote">
      {mascot.quote}
      {#if mascot.credit}<br />{mascot.credit}{/if}
    </p>
  {:else}
    <h1>Dorm Mascots</h1>
    <p class="quote">
      Every year, all first year dorms compete in the
      <strong>Carnegie Cup</strong> to crown the best house!
    </p>
  {/if}
</div>

<style>
  .hero {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    width: 100%;
    min-height: 0;
    max-width: var(--sheet);
    margin-inline: auto;
    padding: 17px 16px 0;
    gap: 16px;
    text-align: center;
  }
  .art {
    display: flex;
    flex: 1;
    align-items: flex-end;
    justify-content: center;
    width: 100%;
    min-height: 0;
    margin-bottom: 14px;
  }
  .art img {
    max-width: 100%;
    max-height: 100%;
  }
  h1 {
    margin: 0;
    font-size: 19px;
    font-weight: 600;
    letter-spacing: 0.15px;
  }
  .quote {
    margin: 0;
    color: var(--primary-light);
    font-size: 15px;
  }
  .quote strong {
    font-weight: 700;
  }
</style>
