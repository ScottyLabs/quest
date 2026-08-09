<script lang="ts">
  import { readNote, saveNote } from "$lib/commemorations";

  let { challengeId }: { challengeId: string } = $props();

  let text = $state("");
  let loaded = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    let live = true;

    readNote(challengeId)
      .then((found) => {
        if (!live) return;
        text = found;
        loaded = true;
      })
      .catch(() => (loaded = true));

    return () => {
      live = false;
    };
  });

  function touched(): void {
    if (!loaded) return;
    clearTimeout(timer);
    timer = setTimeout(() => void saveNote(challengeId, text).catch(() => {}), 500);
  }

  function flush(): void {
    if (!loaded) return;
    clearTimeout(timer);
    void saveNote(challengeId, text).catch(() => {});
  }

  $effect(() => () => clearTimeout(timer));
</script>

<textarea
  bind:value={text}
  placeholder="Write your experiences about completing this challenge... (optional)"
  aria-label="Notes about this challenge"
  rows="3"
  oninput={touched}
  onblur={flush}
></textarea>

<style>
  textarea {
    display: block;
    width: 100%;
    margin-bottom: calc(12 * var(--u));
    padding: calc(12 * var(--u)) calc(14 * var(--u));
    border: calc(2 * var(--u)) solid var(--tertiary-normal);
    border-radius: calc(16 * var(--u));
    background: var(--tertiary-normal);
    color: var(--secondary);
    font: inherit;
    line-height: 1.45;
    resize: none;
    font-size: max(16px, calc(14 * var(--u)));
  }

  textarea::placeholder {
    color: var(--tertiary);
  }

  textarea:focus {
    border-color: var(--accent);
    background: var(--highlight);
    outline: none;
  }
</style>
