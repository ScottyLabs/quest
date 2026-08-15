<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    children,
    tone = "neutral",
  }: { children: Snippet; tone?: "neutral" | "good" | "warn" | "bad" | "accent" } = $props();
</script>

<span class={tone}>{@render children()}</span>

<style>
  span {
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    border-radius: var(--radius-pill);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .neutral {
    background: var(--tertiary-normal);
    color: var(--tertiary);
  }

  .good {
    background: var(--good-fill);
    color: var(--good);
  }

  .warn {
    background: var(--warn-fill);
    color: var(--warn);
  }

  .bad {
    background: var(--danger-fill);
    color: var(--danger);
  }

  .accent {
    background: var(--tint);
    color: var(--shade);
  }
</style>
