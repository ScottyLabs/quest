<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Panel from "$lib/components/Panel.svelte";

  let {
    items,
    onpick,
    onclear,
  }: { items: string[]; onpick: (sql: string) => void; onclear: () => void } = $props();

  function oneLine(sql: string): string {
    const flat = sql.replace(/\s+/gu, " ").trim();

    return flat.length > 140 ? `${flat.slice(0, 139)}…` : flat;
  }
</script>

<Panel title="History" detail="The last 15 statements that ran">
  {#snippet actions()}
    {#if items.length > 0}
      <Button tone="ghost" size="small" onclick={onclear}>Clear history</Button>
    {/if}
  {/snippet}

  {#if items.length === 0}
    <p class="muted">Nothing yet. Statements land here once they run without an error.</p>
  {:else}
    <ul>
      {#each items as entry, index (`${index}:${entry}`)}
        <li>
          <button type="button" title={entry} onclick={() => onpick(entry)}>
            {oneLine(entry)}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</Panel>

<style>
  .muted {
    margin: 0;
    color: var(--tertiary);
    font-size: 13px;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    border-bottom: 1px solid var(--line);
  }

  li:last-child {
    border-bottom: 0;
  }

  button {
    display: block;
    width: 100%;
    padding: 8px 0;
    border: 0;
    background: none;
    color: var(--ink-shade);
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.5;
    text-align: left;
    overflow-wrap: anywhere;
    cursor: pointer;
  }

  button:hover {
    color: var(--accent);
  }
</style>
