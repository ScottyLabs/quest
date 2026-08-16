<script lang="ts">
  let {
    title,
    body,
    confirm = "Try again",
    dismiss = "Not now",
    onconfirm,
    ondismiss,
    image,
  }: {
    title: string;
    body: string;
    confirm?: string;
    dismiss?: string;
    onconfirm?: () => void;
    ondismiss: () => void;
    image?: string;
  } = $props();
</script>

<div class="scrim" role="presentation" onclick={ondismiss}>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div
    class="card"
    role="alertdialog"
    aria-modal="true"
    aria-label={title}
    tabindex="-1"
    onclick={(event) => event.stopPropagation()}
  >
    {#if image}
  <img class="dialog-image" src={image} alt="" />
{:else}
  <span class="bang" aria-hidden="true">!</span>
{/if}

    <h2>{title}</h2>
    <p>{body}</p>

    <div class="acts">
      {#if onconfirm}
        <button class="fill" type="button" onclick={onconfirm}>{confirm}</button>
      {/if}
      <button class="ghost" type="button" onclick={ondismiss}>{dismiss}</button>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    padding: calc(24 * var(--u));
    background: rgb(0 0 0 / 0.55);
    place-items: center;
  }

  .card {
    width: 100%;
    max-width: calc(340 * var(--u));
    padding: calc(24 * var(--u));
    border-radius: calc(24 * var(--u));
    background: var(--highlight);
    text-align: center;
  }

  .dialog-image {
    display: block;
    width: calc(96 * var(--u));
    height: calc(96 * var(--u));
    margin: 0 auto calc(14 * var(--u));
    object-fit: contain;
  }
  .bang {
    display: grid;
    width: calc(52 * var(--u));
    height: calc(52 * var(--u));
    margin: 0 auto calc(14 * var(--u));
    border-radius: 50%;
    background: var(--accent);
    color: var(--highlight);
    font-size: calc(30 * var(--u));
    font-weight: 700;
    line-height: 1;
    place-items: center;
  }

  h2 {
    margin: 0;
    color: var(--secondary);
    font-size: calc(20 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.4 * var(--u));
  }

  p {
    margin: calc(8 * var(--u)) 0 calc(18 * var(--u));
    color: var(--tertiary);
    font-size: calc(14 * var(--u));
    font-weight: 600;
    line-height: 1.5;
  }

  .acts {
    display: flex;
    flex-direction: column;
    gap: calc(8 * var(--u));
  }

  .fill,
  .ghost {
    height: calc(48 * var(--u));
    border-radius: calc(24 * var(--u));
    font: inherit;
    font-size: calc(15 * var(--u));
    font-weight: 700;
    cursor: pointer;
  }

  .fill {
    border: 0;
    background: var(--accent);
    color: var(--highlight);
  }

  .fill:active {
    filter: brightness(0.94);
  }

  .ghost {
    border: 0;
    background: none;
    color: var(--tertiary);
  }
</style>
