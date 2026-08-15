<script lang="ts">
  import { untrack } from "svelte";
  import type { Level, PortalColumn } from "$lib/api/client";
  import { message } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import Field from "$lib/components/Field.svelte";
  import { announce } from "$lib/notice.svelte";
  import { deleteRow, insertRow, updateRow } from "$lib/rows";
  import { fromInput, inputFor, keyOf, toInput, type Cell } from "$lib/values";

  let {
    table,
    columns,
    key,
    level,
    row = null,
    onclose,
    onsaved,
  }: {
    table: string;
    columns: PortalColumn[];
    key: string[];
    level: Level;
    row?: Record<string, unknown> | null;
    onclose: () => void;
    onsaved: () => void;
  } = $props();

  const creating = $derived(row === null);

  const editable = $derived(
    columns.filter((column) => !column.generated && (creating || !key.includes(column.name))),
  );

  let draft = $state<Record<string, string>>(
    untrack(() =>
      Object.fromEntries(columns.map((column) => [column.name, toInput(row?.[column.name])])),
    ),
  );

  let faults = $state<Record<string, string>>({});
  let busy = $state(false);
  let removing = $state(false);

  const mayDelete = $derived(!creating && level === "full");
  const maySave = $derived(creating ? level === "full" : level === "edit" || level === "full");

  function collect(): Record<string, Cell> | null {
    const out: Record<string, Cell> = {};
    const broken: Record<string, string> = {};

    for (const column of editable) {
      const text = draft[column.name] ?? "";

      if (creating && text.trim() === "" && column.default_expr !== null) continue;

      try {
        out[column.name] = fromInput(text, column);
      } catch (error) {
        broken[column.name] = message(error);
      }
    }

    faults = broken;
    return Object.keys(broken).length === 0 ? out : null;
  }

  async function save(): Promise<void> {
    const values = collect();
    if (values === null) return;

    busy = true;

    try {
      if (creating) {
        await insertRow(table, values);
        announce(`Row added to ${table}.`, "good");
      } else {
        await updateRow(table, keyOf(row ?? {}, key), values);
        announce(`Row updated in ${table}.`, "good");
      }

      onsaved();
      onclose();
    } catch (error) {
      announce(message(error), "bad", 12000);
    } finally {
      busy = false;
    }
  }

  async function remove(): Promise<void> {
    busy = true;

    try {
      await deleteRow(table, keyOf(row ?? {}, key));
      announce(`Row deleted from ${table}.`, "good");
      onsaved();
      onclose();
    } catch (error) {
      announce(message(error), "bad", 12000);
    } finally {
      busy = false;
      removing = false;
    }
  }
</script>

<Dialog title={creating ? `New ${table} row` : `Edit ${table} row`} {onclose} wide>
  <div class="form">
    {#each editable as column (column.name)}
      {@const shape = inputFor(column)}
      <Field
        label={column.name}
        hint="{column.kind}{column.nullable ? '' : ' · required'}"
        error={faults[column.name]}
      >
        {#if shape === "boolean"}
          <select bind:value={draft[column.name]}>
            <option value="true">true</option>
            <option value="false">false</option>
            {#if column.nullable}<option value="">null</option>{/if}
          </select>
        {:else if shape === "area" || shape === "json"}
          <textarea bind:value={draft[column.name]} spellcheck="false"></textarea>
        {:else if shape === "number"}
          <input type="text" inputmode="decimal" bind:value={draft[column.name]} />
        {:else}
          <input type="text" bind:value={draft[column.name]} spellcheck="false" />
        {/if}
      </Field>
    {/each}

    {#if !creating}
      <div class="keyed">
        <p class="caption">Primary key</p>
        <dl>
          {#each key as column (column)}
            <dt>{column}</dt>
            <dd>{toInput(row?.[column])}</dd>
          {/each}
        </dl>
      </div>
    {/if}
  </div>

  {#snippet actions()}
    {#if mayDelete}
      {#if removing}
        <Button tone="danger" onclick={remove} {busy}>Really delete</Button>
        <Button tone="ghost" onclick={() => (removing = false)}>Keep</Button>
      {:else}
        <Button tone="danger" onclick={() => (removing = true)}>Delete</Button>
      {/if}
    {/if}

    <Button tone="ghost" onclick={onclose}>Cancel</Button>
    <Button onclick={save} disabled={!maySave} {busy}>
      {creating ? "Create" : "Save"}
    </Button>
  {/snippet}
</Dialog>

<style>
  .form {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  }

  .keyed {
    grid-column: 1 / -1;
    padding: 12px 14px;
    border-radius: var(--radius);
    background: var(--canvas);
  }

  .caption {
    margin: 0 0 6px;
    color: var(--ink-shade);
    font-size: 12px;
    font-weight: 700;
  }

  dl {
    display: grid;
    gap: 2px 12px;
    margin: 0;
    grid-template-columns: max-content 1fr;
  }

  dt {
    color: var(--tertiary);
    font-size: 12px;
  }

  dd {
    margin: 0;
    font-family: var(--mono);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
</style>
