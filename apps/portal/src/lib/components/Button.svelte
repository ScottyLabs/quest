<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    children,
    onclick,
    type = "button",
    tone = "solid",
    size = "normal",
    disabled = false,
    busy = false,
    title,
  }: {
    children: Snippet;
    onclick?: () => void;
    type?: "button" | "submit";
    tone?: "solid" | "ghost" | "line" | "danger";
    size?: "normal" | "small";
    disabled?: boolean;
    busy?: boolean;
    title?: string;
  } = $props();
</script>

<button
  {type}
  {title}
  class="{tone} {size}"
  disabled={disabled || busy}
  onclick={onclick}
>
  {#if busy}<span class="spin" aria-hidden="true"></span>{/if}
  {@render children()}
</button>

<style>
  button {
    display: inline-flex;
    flex: none;
    gap: 8px;
    align-items: center;
    justify-content: center;
    height: 38px;
    padding: 0 18px;
    border: 1px solid transparent;
    border-radius: var(--radius-pill);
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
  }

  .small {
    height: 30px;
    padding: 0 12px;
    font-size: 13px;
  }

  .solid {
    background: var(--accent);
    color: var(--highlight);
  }

  .solid:hover:not(:disabled) {
    background: var(--sink);
  }

  .danger {
    background: var(--danger-fill);
    color: var(--danger);
  }

  .danger:hover:not(:disabled) {
    background: var(--danger);
    color: var(--highlight);
  }

  .line {
    border-color: var(--line);
    background: var(--highlight);
    color: var(--ink-shade);
  }

  .line:hover:not(:disabled) {
    border-color: var(--muted);
  }

  .ghost {
    background: none;
    color: var(--tertiary);
  }

  .ghost:hover:not(:disabled) {
    background: var(--tertiary-normal);
    color: var(--ink-shade);
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .spin {
    width: 12px;
    height: 12px;
    border: 2px solid currentcolor;
    border-radius: 50%;
    border-top-color: transparent;
    animation: turn 0.7s linear infinite;
  }

  @keyframes turn {
    to {
      transform: rotate(1turn);
    }
  }
</style>
