<script lang="ts">
  import type { OptionBody, ShopItem, ShopOption } from "$lib/api/client";
  import { ApiError, message, setItemOptions } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Chip from "$lib/components/Chip.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Empty from "$lib/components/Empty.svelte";
  import Field from "$lib/components/Field.svelte";
  import ChoiceImagePicker from "$lib/components/trade/ChoiceImagePicker.svelte";
  import { announce } from "$lib/notice.svelte";
  import { untrack } from "svelte";

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

  const MAX_OPTIONS = 8;
  const MAX_CHOICES = 24;
  const MAX_TEXT = 60;

  const KINDS = [
    { id: "select", label: "Segmented", hint: "A row of buttons, one tap" },
    { id: "dropdown", label: "Dropdown", hint: "A pull-down list, good for long lists" },
    { id: "text", label: "Free text", hint: "The student types an answer" },
  ] as const;

  type Kind = (typeof KINDS)[number]["id"];

  type ChoiceDraft = ShopOption["choices"][number];

  type Draft = {
  key: number;
  label: string;
  kind: Kind;
  choices: ChoiceDraft[];
  pending: string;
  required: boolean;
};

  type Note = { text: string; hard: boolean };

  const FAULTS: Record<string, string> = {
    options_too_many: `An item can carry at most ${MAX_OPTIONS} options.`,
    option_label_empty: "One of the options has no name.",
    option_label_too_long: `An option name is longer than ${MAX_TEXT} characters.`,
    option_label_repeated: "Two options share the same name.",
    option_kind_unknown: "That option kind is not one the shop understands.",
    option_text_has_choices: "A free-text option cannot carry a choice list.",
    option_choices_empty: "A segmented or dropdown option needs at least one choice.",
    option_choices_too_many: `An option lists more than ${MAX_CHOICES} choices.`,
    option_choice_empty: "One of the choices is blank.",
    option_choice_too_long: `A choice is longer than ${MAX_TEXT} characters.`,
    option_choice_repeated: "An option lists the same choice twice.",
    item_unknown: "This item is no longer in the catalog. Reload the tab.",
    option_price_invalid: "A choice has an invalid ScottyCoin price.",
    option_stock_invalid: "A choice has invalid stock.",
  };

  let seq = 0;

  function stamp(): number {
    seq += 1;

    return seq;
  }

  function readKind(value: string): Kind {
    if (value === "dropdown" || value === "text") return value;

    return "select";
  }

  function fromSaved(option: ShopOption): Draft {
    return {
      key: stamp(),
      label: option.label,
      kind: readKind(option.kind),
      choices: option.choices.map((choice) => ({ ...choice })),
      pending: "",
      required: option.required,
    };
  }

  let drafts = $state<Draft[]>(untrack(() => item.options.map(fromSaved)));
  let awaited: number | null = null;
  let busy = $state(false);
  let fault = $state<string | null>(null);

  function inspect(list: Draft[]): { limit: string | null; byKey: Record<number, Note> } {
    const byKey: Record<number, Note> = {};
    const seen: string[] = [];

    let limit =
      list.length > MAX_OPTIONS
        ? `That is ${list.length} options; an item can carry ${MAX_OPTIONS}.`
        : null;

    for (const draft of list) {
      const label = draft.label.trim();
      const width = [...label].length;

      if (width > MAX_TEXT) {
        byKey[draft.key] = {
          text: `This name runs to ${width} characters; the limit is ${MAX_TEXT}.`,
          hard: true,
        };
      } else if (label === "") {
        byKey[draft.key] = { text: "Name this option, like Size or Colour.", hard: false };
      } else if (seen.includes(label.toLowerCase())) {
        byKey[draft.key] = {
          text: `Another option is already called \u201c${label}\u201d.`,
          hard: false,
        };
      }

      if (label !== "") seen.push(label.toLowerCase());

      if (draft.kind !== "text") {
        const trouble = weigh(draft);

        if (trouble !== null) byKey[draft.key] ??= trouble;
      }

      const note = byKey[draft.key];

      if (note?.hard === true) limit ??= note.text;
    }

    return { limit, byKey };
  }

  function weigh(draft: Draft): Note | null {
    const pool =
  draft.pending.trim() === ""
    ? draft.choices.map((choice) => choice.value)
    : [...draft.choices.map((choice) => choice.value), draft.pending];

    if (pool.length > MAX_CHOICES) {
      return { text: `That is ${pool.length} choices; the limit is ${MAX_CHOICES}.`, hard: true };
    }

    const picks: string[] = [];

    for (const choice of pool) {
      const value = choice.trim();
      const width = [...value].length;

      if (width > MAX_TEXT) {
        const clipped = `\u201c${value.slice(0, 20)}\u2026\u201d`;

        return {
          text: `${clipped} runs to ${width} characters; the limit is ${MAX_TEXT}.`,
          hard: true,
        };
      }

      if (value === "") return { text: "One of the choices is blank.", hard: false };

      const folded = value.toLowerCase();

      if (picks.includes(folded)) {
        return { text: `\u201c${value}\u201d is listed twice.`, hard: false };
      }

      picks.push(folded);
    }

    if (pool.length === 0) {
      return { text: "Add at least one choice, or switch this to free text.", hard: false };
    }

    for (const choice of draft.choices) {
  if (
    choice.cost !== null &&
    choice.cost !== undefined &&
    (!Number.isSafeInteger(choice.cost) || choice.cost < 0)
  ) {
    return {
      text: `"${choice.value}" needs a non-negative whole-number ScottyCoin price.`,
      hard: true,
    };
  }

  if (
    choice.stock !== null &&
    choice.stock !== undefined &&
    (!Number.isSafeInteger(choice.stock) || choice.stock < 0)
  ) {
    return {
      text: `"${choice.value}" needs non-negative whole-number stock.`,
      hard: true,
    };
  }
}

    return null;
  }

  const audit = $derived(inspect(drafts));
  const blocked = $derived(audit.limit !== null);
  const full = $derived(drafts.length >= MAX_OPTIONS);

  function focusing(key: number): (node: HTMLInputElement) => void {
    return (node: HTMLInputElement): void => {
      if (awaited !== key) return;

      awaited = null;
      node.focus();
    };
  }

  function add(): void {
    if (full) return;

    const key = stamp();

    awaited = key;
    drafts.push({ key, label: "", kind: "select", choices: [], pending: "", required: true });
    fault = null;
  }

  function drop(index: number): void {
    if (drafts[index] === undefined) return;

    drafts.splice(index, 1);
    fault = null;
  }

  function shift(index: number, by: number): void {
    const target = index + by;
    const moved = drafts[index];
    const other = drafts[target];

    if (moved === undefined || other === undefined) return;

    drafts[index] = other;
    drafts[target] = moved;
  }

  function absorb(draft: Draft, flush: boolean): void {
    const parts = draft.pending.split(/[,\n\t;]/u);
    const tail = flush ? "" : (parts.pop() ?? "");

    for (const part of parts) {
      const value = part.trim();

      if (value !== "") draft.choices.push({ value });
    }

    draft.pending = tail.replace(/^\s+/u, "");
  }

  function typed(draft: Draft, event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      absorb(draft, true);
      return;
    }

    if (event.key === "Backspace" && draft.pending === "" && draft.choices.length > 0) {
      event.preventDefault();
      draft.choices.pop();
    }
  }

  function cut(draft: Draft, index: number): void {
    draft.choices.splice(index, 1);
  }

  function numberOrNull(input: HTMLInputElement): number | null {
  if (input.value === "") return null;

  const value = input.valueAsNumber;

  return Number.isNaN(value) ? null : value;
}

  function toBody(draft: Draft): OptionBody {
    return {
      label: draft.label.trim(),
      kind: draft.kind,
      choices:
  draft.kind === "text"
    ? []
    : draft.choices.map((choice) => ({
    ...choice,
    value: choice.value.trim(),
    icon_shade: choice.icon_shade?.trim() || null,
  })),
      required: draft.required,
    };
  }

  function reason(error: unknown): string {
    if (error instanceof ApiError) {
      const known = FAULTS[error.code];

      if (known !== undefined) return known;
      if (error.status === 403) return "You are not allowed to edit options on this item.";
    }

    return message(error);
  }

  async function save(): Promise<void> {
    for (const draft of drafts) absorb(draft, true);

    if (audit.limit !== null) {
      fault = audit.limit;
      return;
    }

    busy = true;
    fault = null;

    try {
      const saved = await setItemOptions(item.id, drafts.map(toBody));

      announce(
        saved.length === 0
          ? `Options cleared for ${item.name}.`
          : `${saved.length} option${saved.length === 1 ? "" : "s"} saved for ${item.name}.`,
        "good",
      );
      onsaved();
      onclose();
    } catch (error) {
      fault = reason(error);
    } finally {
      busy = false;
    }
  }

  function kindName(kind: string): string {
    return KINDS.find((entry) => entry.id === kind)?.label ?? kind;
  }
</script>

<Dialog title="Options for {item.name}" {onclose} wide>
  <div class="sheet">
    <p class="lede">
      Options are what the app asks a student before they buy. They appear in the order below, and
      the desk sees the answer on the order.
    </p>

    {#if fault !== null}
      <p class="alarm" role="alert">{fault}</p>
    {/if}

    {#if !editable}
      {#if drafts.length === 0}
        <Empty
          title="No options"
          detail="This item is bought as-is, with nothing for the student to choose."
        />
      {:else}
        <ol class="readout">
          {#each drafts as draft (draft.key)}
            <li>
              <div class="head">
                <span class="name">{draft.label}</span>
                <Chip>{kindName(draft.kind)}</Chip>
                {#if draft.required}<Chip tone="accent">required</Chip>{/if}
              </div>
              {#if draft.kind !== "text"}
                <div class="chips">
                  {#each draft.choices as choice, index (index)}
                    <Chip>{choice.value}</Chip>
                  {/each}
                </div>
              {/if}
            </li>
          {/each}
        </ol>
      {/if}
    {:else if drafts.length === 0}
      <Empty
        title="No options yet"
        detail="This item is bought as-is. Add an option to ask for a size, a colour, or a name to
          print on the tag."
      />
    {:else}
      <ol class="list">
        {#each drafts as draft, index (draft.key)}
          {@const note = audit.byKey[draft.key]}
          <li class="option" class:broken={note?.hard === true} class:iffy={note?.hard === false}>
            <div class="bar">
              <span class="rank">{index + 1}</span>

              <div class="kinds" role="group" aria-label="Option kind">
                {#each KINDS as choice (choice.id)}
                  <button
                    type="button"
                    class:on={draft.kind === choice.id}
                    title={choice.hint}
                    aria-pressed={draft.kind === choice.id}
                    onclick={() => (draft.kind = choice.id)}
                  >
                    {choice.label}
                  </button>
                {/each}
              </div>

              <div class="moves">
                <button
                  type="button"
                  title="Move up"
                  aria-label="Move {draft.label || 'this option'} up"
                  disabled={index === 0}
                  onclick={() => shift(index, -1)}
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  title="Move down"
                  aria-label="Move {draft.label || 'this option'} down"
                  disabled={index === drafts.length - 1}
                  onclick={() => shift(index, 1)}
                >
                  &darr;
                </button>
                <button
                  type="button"
                  class="kill"
                  title="Remove this option"
                  aria-label="Remove {draft.label || 'this option'}"
                  onclick={() => drop(index)}
                >
                  &times;
                </button>
              </div>
            </div>

            <div class="row">
              <Field label="Question" hint="{[...draft.label.trim()].length}/{MAX_TEXT}">
                <input
                  {@attach focusing(draft.key)}
                  bind:value={draft.label}
                  type="text"
                  placeholder="Size"
                  spellcheck="false"
                />
              </Field>

              <label class="toggle">
                <input type="checkbox" bind:checked={draft.required} />
                <span>
                  Required
                  <em>{draft.required ? "must be answered" : "may be left blank"}</em>
                </span>
              </label>
            </div>

            {#if draft.kind !== "text"}
              <div class="choices">
                <div class="caption">
                  <span>Choices</span>
                  <span class="count" class:over={draft.choices.length > MAX_CHOICES}>
                    {draft.choices.length}/{MAX_CHOICES}
                  </span>
                </div>

                {#if draft.choices.length > 0}
                  <ul class="picks">
  {#each draft.choices as choice, spot (spot)}
    <li>
      <div class="choice-top">
        <input
          class="choice-name"
          bind:value={choice.value}
          type="text"
          size="1"
          aria-label="Choice {spot + 1}"
          spellcheck="false"
        />

        <button
          class="remove-choice"
          type="button"
          title="Remove this choice"
          aria-label="Remove {choice.value || `choice ${spot + 1}`}"
          onclick={() => cut(draft, spot)}
        >
          &times;
        </button>
      </div>

      <div class="choice-fields">
        <label class="choice-field">
          <span>Cost</span>
          <input
            type="number"
            min="0"
            step="1"
            value={choice.cost ?? ""}
            placeholder="inherit"
            oninput={(event) => {
              choice.cost = numberOrNull(event.currentTarget);
            }}
          />
          <em>Blank uses the parent item's price.</em>
        </label>

        <label class="choice-field">
          <span>Stock</span>
          <input
            type="number"
            min="0"
            step="1"
            value={choice.stock ?? ""}
            placeholder="inherit"
            oninput={(event) => {
              choice.stock = numberOrNull(event.currentTarget);
            }}
          />
          <em>Blank uses only the parent item's stock.</em>
        </label>
      </div>

      <div class="choice-art">
        <ChoiceImagePicker
          slot="icon"
          value={choice.image_url}
          name={choice.value || `choice ${spot + 1}`}
          onchange={(url) => {
            choice.image_url = url;
          }}
        />

        <ChoiceImagePicker
          slot="background"
          value={choice.background_url}
          name={choice.value || `choice ${spot + 1}`}
          onchange={(url) => {
            choice.background_url = url;
          }}
        />
      </div>

      <label class="choice-field shade-field">
        <span>Icon shade</span>
        <input
          type="text"
          value={choice.icon_shade ?? ""}
          placeholder={item.icon_shade ?? "inherit"}
          spellcheck="false"
          oninput={(event) => {
            choice.icon_shade = event.currentTarget.value === "" ? null : event.currentTarget.value;
          }}
        />
        <em>
          Blank inherits the parent item's shade. Hex colours such as #c41230 work.
        </em>
      </label>
    </li>
  {/each}
</ul>
                {/if}

                <div class="entry">
                  <input
                    bind:value={draft.pending}
                    type="text"
                    placeholder="Type a choice, or paste S, M, L, XL"
                    aria-label="Add a choice"
                    spellcheck="false"
                    oninput={() => absorb(draft, false)}
                    onkeydown={(event) => typed(draft, event)}
                    onblur={() => absorb(draft, true)}
                  />
                  <Button
                    size="small"
                    tone="line"
                    disabled={draft.pending.trim() === ""}
                    onclick={() => absorb(draft, true)}
                  >
                    Add
                  </Button>
                </div>

                <p class="tip">
                  Enter adds a choice. Commas split a pasted list. Backspace on an empty box takes
                  the last one back.
                </p>
              </div>
            {:else}
              <p class="tip">
                The student types their own answer, up to 120 characters. No choice list here.
              </p>
            {/if}

            {#if note !== undefined}
              <p class="trouble" class:hard={note.hard}>{note.text}</p>
            {/if}
          </li>
        {/each}
      </ol>
    {/if}

    {#if editable}
      <div class="adder">
        <Button
          size="small"
          tone="line"
          disabled={full}
          title={full ? `An item can carry at most ${MAX_OPTIONS} options.` : undefined}
          onclick={add}
        >
          Add an option
        </Button>
        <span class="count">{drafts.length}/{MAX_OPTIONS}</span>
      </div>
    {/if}
  </div>

  {#snippet actions()}
    {#if editable && audit.limit !== null}
      <span class="hold">{audit.limit}</span>
    {/if}

    <Button tone="ghost" onclick={onclose}>{editable ? "Cancel" : "Close"}</Button>

    {#if editable}
      <Button onclick={() => void save()} disabled={blocked} {busy}>Save options</Button>
    {/if}
  {/snippet}
</Dialog>

<style>
  .sheet {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .lede {
    margin: 0;
    color: var(--tertiary);
    font-size: 12px;
    line-height: 1.6;
  }

  .alarm {
    margin: 0;
    padding: 10px 12px;
    border: 1px solid var(--danger);
    border-radius: var(--radius);
    background: var(--danger-fill);
    color: var(--danger);
    font-size: 13px;
    font-weight: 700;
  }

  .list,
  .readout {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .readout li {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--canvas);
  }

  .readout .head,
  .readout .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .readout .name {
    font-size: 13px;
    font-weight: 800;
  }

  .option {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--canvas);
  }

  .option.broken {
    border-color: var(--danger);
  }

  .option.iffy {
    border-color: var(--warn);
  }

  .bar {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .rank {
    display: grid;
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--tertiary-normal);
    color: var(--tertiary);
    font-size: 11px;
    font-weight: 800;
    place-items: center;
  }

  .kinds {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--highlight);
  }

  .kinds button {
    padding: 4px 12px;
    border: 0;
    border-radius: var(--radius-pill);
    background: none;
    color: var(--tertiary);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .kinds button:hover:not(.on) {
    background: var(--tertiary-normal);
    color: var(--ink-shade);
  }

  .kinds button.on {
    background: var(--accent);
    color: var(--highlight);
  }

  .moves {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }

  .moves button {
    width: 26px;
    height: 26px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--highlight);
    color: var(--tertiary);
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
  }

  .moves button:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }

  .moves button:disabled {
    color: var(--muted);
    cursor: default;
  }

  .moves .kill:hover {
    border-color: var(--danger);
    background: var(--danger-fill);
    color: var(--danger);
  }

  .row {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .row :global(label) {
    flex: 1;
  }

  .toggle {
    display: flex;
    flex: none;
    gap: 8px;
    align-items: flex-start;
    padding-top: 24px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .toggle input {
    width: 15px;
    height: 15px;
    margin: 1px 0 0;
    accent-color: var(--accent);
  }

  .toggle em {
    display: block;
    color: var(--muted);
    font-size: 11px;
    font-style: normal;
    font-weight: 400;
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .caption {
    display: flex;
    gap: 8px;
    align-items: baseline;
    color: var(--ink-shade);
    font-size: 12px;
    font-weight: 700;
  }

  .count {
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 400;
  }

  .count.over {
    color: var(--danger);
    font-weight: 700;
  }

  .picks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.picks li {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--highlight);
}

.choice-top {
  display: flex;
  gap: 8px;
  align-items: center;
}

.choice-name {
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--canvas);
  font-size: 13px;
  font-weight: 700;
}

.choice-name:focus {
  border-color: var(--accent);
  outline: none;
}

.remove-choice {
  flex: none;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--canvas);
  color: var(--muted);
  font-size: 16px;
  cursor: pointer;
}

.remove-choice:hover {
  border-color: var(--danger);
  background: var(--danger-fill);
  color: var(--danger);
}

.choice-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.choice-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.choice-field span {
  color: var(--ink-shade);
  font-size: 11px;
  font-weight: 800;
}

.choice-field input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 7px 9px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--canvas);
  font: inherit;
  font-size: 12px;
}

.choice-field input:focus {
  border-color: var(--accent);
  outline: none;
}

.choice-field em {
  color: var(--muted);
  font-size: 10px;
  font-style: normal;
  font-weight: 400;
  line-height: 1.4;
}

.choice-art {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.shade-field {
  max-width: 22rem;
}

@media (max-width: 700px) {
  .choice-fields,
  .choice-art {
    grid-template-columns: 1fr;
  }
}

  .entry {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .entry input {
    flex: 1;
    min-width: 0;
    padding: 7px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--highlight);
    font-size: 13px;
  }

  .entry input:focus {
    border-color: var(--accent);
    outline: none;
  }

  .tip {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }

  .trouble {
    margin: 0;
    color: var(--warn);
    font-size: 12px;
    font-weight: 700;
  }

  .trouble.hard {
    color: var(--danger);
  }

  .adder {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .hold {
    margin-right: auto;
    align-self: center;
    color: var(--danger);
    font-size: 12px;
    font-weight: 700;
    text-align: left;
  }
</style>
