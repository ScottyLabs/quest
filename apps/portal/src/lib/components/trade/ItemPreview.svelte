<script lang="ts">
  import { untrack } from "svelte";
  import type { ShopItem, ShopOption } from "$lib/api/client";
  import { message } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Field from "$lib/components/Field.svelte";
  import { announce } from "$lib/notice.svelte";
  import { updateRow } from "$lib/rows";

  let {
    item,
    editable,
    onclose,
    onsaved,
  }: {
    item: ShopItem;
    editable: boolean;
    onclose: () => void;
    onsaved: () => void;
  } = $props();

  const TINT = "#9a1023";
  const SHADE = "#730c1a";
  const HEX = /^#[0-9a-f]{6}$/iu;

  function paint(value: string | null | undefined, fallback: string): string {
    return typeof value === "string" && HEX.test(value) ? value : fallback;
  }

  function ink(hex: string): string {
    const value = Number.parseInt(hex.slice(1), 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const weighed = 0.299 * red + 0.587 * green + 0.114 * (value & 255);

    return weighed > 150 ? "rgb(0 0 0 / 0.6)" : "rgb(255 255 255 / 0.75)";
  }

  function segments(option: ShopOption): string[] {
    return option.choices.filter((choice) => choice.trim() !== "");
  }

  function typed(value: string | null | undefined): string {
    return typeof value === "string" ? value : "";
  }

  function trouble(draft: string): string | null {
    if (draft.trim() === "") return null;

    return HEX.test(draft.trim()) ? null : "Six hex digits after a hash, like #642c8f.";
  }

  function column(draft: string): string | null {
    const value = draft.trim().toLowerCase();

    return value === "" ? null : value;
  }

  let front = $state(untrack(() => typed(item.icon_tint)));
  let behind = $state(untrack(() => typed(item.icon_shade)));
  let busy = $state(false);
  let fault = $state<string | null>(null);

  const hero = $derived(item.background_url ?? null);
  const glyph = $derived(item.image_url ?? null);
  const blurb = $derived(item.description.trim());
  const tint = $derived(paint(front, TINT));
  const shade = $derived(paint(behind, SHADE));
  const hint = $derived(ink(tint));
  const frontFault = $derived(trouble(front));
  const behindFault = $derived(trouble(behind));
  const dirty = $derived(
    column(front) !== (item.icon_tint ?? null) || column(behind) !== (item.icon_shade ?? null),
  );

  async function save(): Promise<void> {
    if (frontFault !== null || behindFault !== null) return;

    busy = true;
    fault = null;

    try {
      await updateRow(
        "items",
        { id: item.id },
        { icon_tint: column(front), icon_shade: column(behind) },
      );
      announce(`Icon colours saved for ${item.name}.`, "good");
      onsaved();
    } catch (error) {
      fault = message(error);
    } finally {
      busy = false;
    }
  }
</script>

<Dialog title="Preview of {item.name}" {onclose}>
  <p class="lede">
    How the app draws this item once a student taps it. Nothing here is live, and the balance line
    has no student behind it.
  </p>

  <div class="stage">
    <div class="frame">
      <div class="sheet" style="--tint: {tint}; --shade: {shade}; --hint: {hint}">
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
              {@const choices = segments(option)}
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
                      <span class:on={spot === 0}>{choice}</span>
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
          <span class="plate back"></span>
          <span class="plate front"></span>
          {#if glyph !== null}
            <img class="mark" src={glyph} alt="" />
          {:else}
            <span class="mark none">No icon</span>
          {/if}
        </div>
      </div>
    </div>
  </div>

  {#if editable}
    <div class="tune">
      <p class="head">
        Icon colours
        <span>The two tilted plates behind the icon. Leave a box empty for the app default.</span>
      </p>

      {#if fault !== null}
        <p class="alarm" role="alert">{fault}</p>
      {/if}

      <div class="pair">
        <Field label="Icon colour" hint="default {TINT}" error={frontFault}>
          <div class="mix">
            <input
              type="color"
              value={tint}
              aria-label="Pick the icon colour"
              oninput={(event) => (front = event.currentTarget.value)}
            />
            <input
              bind:value={front}
              type="text"
              placeholder={TINT}
              spellcheck="false"
              aria-label="Icon colour hex"
            />
            <Button size="small" tone="ghost" disabled={front === ""} onclick={() => (front = "")}>
              Default
            </Button>
          </div>
        </Field>

        <Field label="Icon shadow" hint="default {SHADE}" error={behindFault}>
          <div class="mix">
            <input
              type="color"
              value={shade}
              aria-label="Pick the icon shadow colour"
              oninput={(event) => (behind = event.currentTarget.value)}
            />
            <input
              bind:value={behind}
              type="text"
              placeholder={SHADE}
              spellcheck="false"
              aria-label="Icon shadow hex"
            />
            <Button size="small" tone="ghost" disabled={behind === ""} onclick={() => (behind = "")}>
              Default
            </Button>
          </div>
        </Field>
      </div>
    </div>
  {/if}

  {#snippet actions()}
    <Button tone="line" onclick={onclose}>Close</Button>
    {#if editable}
      <Button
        disabled={!dirty || frontFault !== null || behindFault !== null}
        {busy}
        onclick={() => void save()}
      >
        Save colours
      </Button>
    {/if}
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

  .tune {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
  }

  .head {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    color: var(--ink-shade);
    font-size: 13px;
    font-weight: 800;
  }

  .head span {
    color: var(--tertiary);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
  }

  .alarm {
    margin: 0;
    padding: 8px 10px;
    border-radius: var(--radius);
    background: var(--danger-fill);
    color: var(--danger);
    font-size: 12px;
    font-weight: 600;
  }

  .pair {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  }

  .mix {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .mix input[type="color"] {
    flex: none;
    width: 34px;
    height: 32px;
    padding: 2px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--highlight);
    cursor: pointer;
  }

  .mix input[type="text"] {
    min-width: 0;
    font-family: var(--mono);
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

  .plate {
    position: absolute;
    border-radius: calc(12 * var(--p));
  }

  .plate.back {
    top: calc(19 * var(--p));
    right: calc(-9 * var(--p));
    width: calc(93.774 * var(--p));
    height: calc(78.117 * var(--p));
    background: var(--shade);
    transform: rotate(-6.69deg) skewX(3.13deg);
  }

  .plate.front {
    inset: 0;
    background: var(--tint);
    box-shadow: 0 calc(4 * var(--p)) calc(10 * var(--p)) rgb(0 0 0 / 0.28);
    transform: rotate(-7.57deg) skewX(1.1deg);
  }

  .mark {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: calc(14 * var(--p));
    object-fit: contain;
  }

  .mark.none {
    display: grid;
    color: var(--hint);
    font-size: calc(11 * var(--p));
    font-weight: 700;
    text-align: center;
    place-items: center;
  }
</style>
