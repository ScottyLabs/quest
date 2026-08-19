<script lang="ts">
  import type { ItemOption } from "$lib/trade.svelte";
  import SegmentPicker from "./SegmentPicker.svelte";

  let {
    option,
    value,
    onpick,
  }: {
    option: ItemOption;
    value: string;
    onpick: (next: string) => void;
  } = $props();
</script>

<div class="field">
  <p class="caption">
    {option.label}:{#if !option.required}<span class="spare">optional</span>{/if}
  </p>

  {#if option.kind === "select"}
    <SegmentPicker
  label={option.label}
  choices={option.choices.map((choice) => choice.value)}
  {value}
  {onpick}
/>
  {:else if option.kind === "dropdown"}
    <div class="shell">
      <select
        aria-label={option.label}
        aria-required={option.required}
        {value}
        onchange={(event) => onpick(event.currentTarget.value)}
      >
        <option value="" disabled={option.required}>
          {option.required ? `Choose ${option.label.toLowerCase()}` : "No preference"}
        </option>
        {#each option.choices as choice (choice.value)}
  <option value={choice.value}>{choice.value}</option>
{/each}
      </select>
    </div>
  {:else}
    <input
      type="text"
      aria-label={option.label}
      aria-required={option.required}
      maxlength="120"
      autocomplete="off"
      {value}
      oninput={(event) => onpick(event.currentTarget.value)}
    />
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: calc(3 * var(--u));
  }

  .caption {
    margin: 0;
    color: var(--tertiary);
    font-size: calc(15 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.3 * var(--u));
  }

  .spare {
    margin-left: calc(6 * var(--u));
    color: var(--muted);
    font-size: calc(12 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.24 * var(--u));
  }

  .shell {
    position: relative;
    display: block;
  }

  .shell::after {
    position: absolute;
    top: 50%;
    right: calc(13 * var(--u));
    width: calc(7 * var(--u));
    height: calc(7 * var(--u));
    border-right: calc(2 * var(--u)) solid var(--tertiary);
    border-bottom: calc(2 * var(--u)) solid var(--tertiary);
    content: "";
    transform: translateY(-70%) rotate(45deg);
    pointer-events: none;
  }

  select,
  input {
    width: 100%;
    height: calc(35 * var(--u));
    border: 1px solid var(--trade-control);
    border-radius: calc(8 * var(--u));
    background: var(--highlight);
    color: var(--secondary);
    font: inherit;
    font-size: max(16px, calc(14 * var(--u)));
    font-weight: 600;
    line-height: calc(24 * var(--u));
    filter: drop-shadow(0 calc(4 * var(--u)) 0 var(--trade-control));
  }

  select {
    padding: 0 calc(30 * var(--u)) 0 calc(11 * var(--u));
    appearance: none;
    cursor: pointer;
  }

  input {
    padding: 0 calc(11 * var(--u));
  }

  input::placeholder {
    color: var(--tertiary);
  }

  select:focus-visible,
  input:focus {
    border-color: var(--secondary);
    outline: none;
  }
</style>
