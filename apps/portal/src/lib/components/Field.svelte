<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label,
    hint,
    error,
    children,
  }: { label: string; hint?: string; error?: string | null; children: Snippet } = $props();
</script>

<label>
  <span class="label">
    {label}
    {#if hint !== undefined}<span class="hint">{hint}</span>{/if}
  </span>

  {@render children()}

  {#if error}<span class="error">{error}</span>{/if}
</label>

<style>
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .label {
    display: flex;
    gap: 8px;
    align-items: baseline;
    color: var(--ink-shade);
    font-size: 12px;
    font-weight: 700;
  }

  .hint {
    color: var(--muted);
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 400;
  }

  .error {
    color: var(--danger);
    font-size: 12px;
    font-weight: 600;
  }

  label :global(input),
  label :global(select),
  label :global(textarea) {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--highlight);
    font-size: 13px;
  }

  label :global(textarea) {
    min-height: 76px;
    font-family: var(--mono);
    resize: vertical;
  }

  label :global(input:focus),
  label :global(select:focus),
  label :global(textarea:focus) {
    border-color: var(--accent);
    outline: none;
  }
</style>
