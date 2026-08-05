<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    children,
    onclick,
    type = "button",
  }: { children: Snippet; onclick?: () => void; type?: "button" | "submit" } = $props();
</script>

<button {type} {onclick}>{@render children()}</button>

<style>
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 48px;
    padding: 12px 32px;
    border: 0;
    border-radius: 24px;
    background: var(--primary);
    color: var(--highlight);
    font-family: inherit;
    font-size: 16px;
    font-weight: 700;
    line-height: 24px;
    cursor: pointer;
  }

  button:active {
    opacity: 0.9;
  }
</style>
