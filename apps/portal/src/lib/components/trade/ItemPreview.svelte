<script lang="ts">
  import type { ShopItem } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";

  let {
    item,
    onclose,
  }: {
    item: ShopItem;
    onclose: () => void;
  } = $props();

  const hero = $derived(item.background_url ?? null);
  const glyph = $derived(item.image_url ?? null);
  const blurb = $derived(item.description.trim());
</script>

<Dialog title="Preview of {item.name}" {onclose}>
  <p class="lede">
    How the app draws this item once a student taps it. Nothing here is live, and the balance line
    has no student behind it.
  </p>

  <div class="stage">
    <div class="frame">
      <div class="sheet">
        <div class="hero">
          {#if hero !== null}
            <img src={hero} alt="" />
          {:else}
            <span class="gap">No background image</span>
          {/if}
        </div>

        <div class="card">
          <div class="flow">
            <div class="well">
              <h3>{item.name}</h3>
              <p class="left">Items left: <strong>{item.stock}</strong></p>
            </div>

            <p class="tag">Description:</p>
            {#if blurb === ""}
              <p class="body faint">No description</p>
            {:else}
              <p class="body">{blurb}</p>
            {/if}

            {#each item.options as option (option.id)}
              {@const choices = option.choices.filter((choice) => choice.value.trim() !== "")}
              <div class="ask">
                <p class="tag quiet">
                  {option.label}:
                  {#if !option.required}<span class="spare">optional</span>{/if}
                </p>

                {#if option.kind === "text"}
                  <div class="type"></div>
                {:else if option.kind === "dropdown"}
                  <div class="pick">
                    <span>Choose {option.label}</span>
                    <span class="caret" aria-hidden="true">&#9660;</span>
                  </div>
                {:else if choices.length === 0}
                  <div class="seg"><span class="bare">No choices set</span></div>
                {:else}
                  <div class="seg">
                    {#each choices as choice, spot (spot)}
                      <span class:on={spot === 0}>{choice.value}</span>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          <div class="tail">
            <div class="bill">
              <div class="band">
                Total Cost: <span class="num">{item.cost}</span>
                <span class="coin" aria-hidden="true"></span>
              </div>
              <div class="band under">
                ScottyCoins After Purchase:
                <span class="coin" aria-hidden="true"></span>
                <span class="num">&#8212;</span>
              </div>
            </div>

            <div class="acts">
              <span class="btn cancel">Cancel</span>
              <span class="btn buy">Purchase</span>
            </div>
          </div>
        </div>

        <div class="badge">
          {#if glyph !== null}
            <img class="mark" src={glyph} alt="" />
          {:else}
            <span class="mark none">No icon</span>
          {/if}
        </div>
      </div>
    </div>
  </div>

  {#snippet actions()}
    <Button tone="line" onclick={onclose}>Close</Button>
  {/snippet}
</Dialog>

<style>
  .lede {
    margin: 0 0 16px;
    color: var(--tertiary);
    font-size: 13px;
    line-height: 1.5;
  }

  .stage {
    display: flex;
    justify-content: center;
  }

  .frame {
    --p: 0.72px;

    display: flex;
    align-items: center;
    width: calc(439 * var(--p));
    height: calc(880 * var(--p));
    padding: calc(26 * var(--p)) 0;
    border-radius: calc(34 * var(--p));
    background: var(--ink-shade);
    overflow: hidden;
  }

  .sheet {
    display: flex;
    position: relative;
    flex-direction: column;
    width: 100%;
    max-height: 100%;
  }

  .hero {
    display: grid;
    flex: none;
    height: calc(224 * var(--p));
    border-radius: calc(26 * var(--p)) calc(26 * var(--p)) 0 0;
    background: var(--tertiary-normal);
    overflow: hidden;
    place-items: center;
  }

  .hero img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .gap {
    color: var(--tertiary);
    font-size: calc(14 * var(--p));
    font-weight: 700;
  }

  .card {
    display: flex;
    z-index: 1;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    margin-top: calc(-26 * var(--p));
    border-radius: calc(26 * var(--p));
    background: var(--highlight);
  }

  .flow {
    flex: 1 1 auto;
    min-height: 0;
    padding: calc(17 * var(--p)) calc(20 * var(--p)) calc(6 * var(--p));
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .well {
    padding: calc(16 * var(--p)) calc(18 * var(--p));
    border: 1px solid var(--line);
    border-radius: calc(11 * var(--p));
    background: var(--highlight);
    box-shadow: 0 calc(2 * var(--p)) calc(6 * var(--p)) rgb(0 0 0 / 0.07);
  }

  .well h3 {
    margin: 0;
    color: var(--secondary);
    font-size: calc(24 * var(--p));
    font-weight: 800;
    line-height: 1.16;
    overflow-wrap: anywhere;
  }

  .left {
    margin: calc(10 * var(--p)) 0 0;
    color: var(--tertiary);
    font-size: calc(15 * var(--p));
  }

  .left strong {
    color: var(--ink-shade);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .tag {
    margin: calc(22 * var(--p)) 0 0;
    color: var(--ink-shade);
    font-size: calc(15 * var(--p));
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .tag.quiet {
    color: var(--tertiary);
  }

  .spare {
    color: var(--muted);
    font-size: calc(12 * var(--p));
    font-weight: 700;
  }

  .body {
    margin: calc(8 * var(--p)) 0 0;
    color: var(--muted);
    font-size: calc(13 * var(--p));
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

  .body.faint {
    font-style: italic;
  }

  .ask .tag {
    margin-top: calc(20 * var(--p));
  }

  .seg {
    display: flex;
    gap: calc(2 * var(--p));
    margin-top: calc(8 * var(--p));
    padding: calc(2 * var(--p));
    border: 1px solid var(--muted);
    border-radius: calc(10 * var(--p));
    background: var(--tertiary-normal);
    box-shadow: 0 calc(3 * var(--p)) calc(6 * var(--p)) rgb(0 0 0 / 0.22);
  }

  .seg span {
    flex: 1 1 0;
    min-width: 0;
    padding: calc(9 * var(--p)) calc(4 * var(--p));
    border-radius: calc(8 * var(--p));
    color: var(--secondary);
    font-size: calc(15 * var(--p));
    font-weight: 700;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .seg span.on {
    background: var(--highlight);
    box-shadow: 0 calc(1 * var(--p)) calc(3 * var(--p)) rgb(0 0 0 / 0.26);
  }

  .seg span.bare {
    color: var(--tertiary);
    font-weight: 600;
  }

  .pick,
  .type {
    display: flex;
    gap: calc(8 * var(--p));
    align-items: center;
    justify-content: space-between;
    height: calc(40 * var(--p));
    margin-top: calc(8 * var(--p));
    padding: 0 calc(14 * var(--p));
    border: 1px solid var(--muted);
    border-radius: calc(10 * var(--p));
    background: var(--highlight);
    color: var(--tertiary);
    font-size: calc(15 * var(--p));
  }

  .pick span {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .pick .caret {
    flex: none;
    color: var(--ink-shade);
    font-size: calc(10 * var(--p));
  }

  .tail {
    flex: none;
    padding: calc(14 * var(--p)) calc(20 * var(--p)) calc(20 * var(--p));
  }

  .bill {
    border-radius: calc(14 * var(--p));
    overflow: hidden;
  }

  .band {
    display: flex;
    gap: calc(6 * var(--p));
    align-items: center;
    justify-content: flex-end;
    padding: calc(12 * var(--p)) calc(18 * var(--p));
    background: #9b0113;
    color: var(--highlight);
    font-size: calc(15 * var(--p));
    font-weight: 800;
  }

  .band.under {
    background: #730c1a;
    font-style: italic;
  }

  .band .num {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .coin {
    flex: none;
    width: calc(15 * var(--p));
    height: calc(15 * var(--p));
    border-radius: 50%;
    background: var(--coin);
  }

  .acts {
    display: flex;
    gap: calc(16 * var(--p));
    margin-top: calc(16 * var(--p));
  }

  .btn {
    flex: 1 1 0;
    padding: calc(11 * var(--p)) 0;
    border: calc(2 * var(--p)) solid var(--primary);
    border-radius: calc(14 * var(--p));
    font-size: calc(16 * var(--p));
    font-weight: 800;
    text-align: center;
  }

  .btn.cancel {
    background: var(--highlight);
    color: var(--primary);
  }

  .btn.buy {
    background: var(--primary);
    color: var(--highlight);
  }

  .badge {
    position: absolute;
    z-index: 2;
    top: calc(122 * var(--p));
    right: calc(22 * var(--p));
    width: calc(91.785 * var(--p));
    height: calc(86.263 * var(--p));
  }

  .mark {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .mark.none {
    display: grid;
    border: 1px solid var(--line);
    border-radius: calc(12 * var(--p));
    background: var(--tertiary-normal);
    color: var(--tertiary);
    font-size: calc(11 * var(--p));
    font-weight: 700;
    text-align: center;
    place-items: center;
  }
</style>
