<script lang="ts">
  import { message, uploadAsset } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import { announce } from "$lib/notice.svelte";
  import { normalizeSvgFile, rasterWrapped } from "$lib/svg";

  let {
    value,
    slot,
    name,
    onchange,
  }: {
    value: string | null | undefined;
    slot: "icon" | "background";
    name: string;
    onchange: (url: string | null) => void;
  } = $props();

  const LIMIT = 8 * 1024 * 1024;

  const LABEL = {
    icon: "Icon",
    background: "Background",
  } as const;

  const HINT = {
    icon: "Overrides the parent item's icon for this choice",
    background: "Overrides the parent item's hero image for this choice",
  } as const;

  const current = $derived(value ?? null);

  let field = $state<HTMLInputElement | null>(null);
  let busy = $state(false);

  async function picked(event: Event & { currentTarget: HTMLInputElement }): Promise<void> {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (file !== undefined) {
      if (!file.type.startsWith("image/")) {
        announce("That is not an image. Pick a png, jpeg, webp or svg.", "bad");
      } else if (file.size > LIMIT) {
        announce("That image is larger than the 8 MiB limit.", "bad");
      } else {
        busy = true;

        const svg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
        const text = svg ? await file.text() : "";
        const wrapped = svg && rasterWrapped(text);
        const shaped = svg ? await normalizeSvgFile(file) : file;
        const untouched = shaped === null;

        try {
          const asset = await uploadAsset("items", shaped ?? file);

          onchange(asset.url);

          if (wrapped) {
            announce(
              `${LABEL[slot]} uploaded for ${name}, but that SVG is bitmaps wrapped in a Figma pattern. ` +
                "Safari may render it differently. Re-export it as a PNG if necessary. Save options to apply it.",
              "info",
              14000,
            );
          } else {
            announce(
              untouched
                ? `${LABEL[slot]} uploaded for ${name}, but the art could not be measured and may sit off-centre. Save options to apply it.`
                : `${LABEL[slot]} uploaded for ${name}. Save options to apply it.`,
              untouched ? "info" : "good",
              untouched ? 10000 : 6000,
            );
          }
        } catch (error) {
          announce(message(error), "bad", 10000);
        } finally {
          busy = false;
        }
      }
    }

    input.value = "";
  }
</script>

<div class="picker" class:wide={slot === "background"}>
  <div class="preview" class:empty={current === null}>
    {#if current === null}
      <span class="none">inherit</span>
    {:else}
      <img src={current} alt="" loading="lazy" />
    {/if}
  </div>

  <div class="about">
    <p class="label">{LABEL[slot]}</p>
    <p class="hint">{HINT[slot]}</p>
  </div>

  <div class="acts">
    <Button size="small" tone="line" {busy} onclick={() => field?.click()}>
      {current === null ? "Upload" : "Replace"}
    </Button>

    {#if current !== null}
      <Button size="small" tone="ghost" {busy} onclick={() => onchange(null)}>Clear</Button>
    {/if}
  </div>
</div>

<input
  bind:this={field}
  class="file"
  type="file"
  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif"
  onchange={(event) => void picked(event)}
/>

<style>
  .picker {
    display: flex;
    gap: 10px;
    align-items: center;
    min-width: 0;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--canvas);
  }

  .preview {
    display: grid;
    flex: none;
    width: 42px;
    height: 42px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--tertiary-normal);
    overflow: hidden;
    place-items: center;
  }

  .wide .preview {
    width: 68px;
  }

  .preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .none {
    color: var(--muted);
    font-family: var(--mono);
    font-size: 9px;
  }

  .about {
    flex: 1;
    min-width: 0;
  }

  .label {
    margin: 0;
    font-size: 11px;
    font-weight: 800;
  }

  .hint {
    margin: 1px 0 0;
    color: var(--tertiary);
    font-size: 10px;
    line-height: 1.35;
  }

  .acts {
    display: flex;
    flex: none;
    gap: 4px;
  }

  .file {
    display: none;
  }
</style>