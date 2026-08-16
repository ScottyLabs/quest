<script lang="ts">
  import type { ShopItem } from "$lib/api/client";
  import { message, uploadAsset } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import { announce } from "$lib/notice.svelte";
  import { updateRow } from "$lib/rows";
  import { normalizeSvgFile } from "$lib/svg";

  let {
    item,
    slot,
    onsaved,
  }: {
    item: ShopItem;
    slot: "icon" | "background";
    onsaved: () => void;
  } = $props();

  const LIMIT = 8 * 1024 * 1024;

  const COLUMN = { icon: "image_url", background: "background_url" } as const;
  const LABEL = { icon: "Icon", background: "Background" } as const;
  const HINT = {
    icon: "The glyph on the item's tile, in the list and on the sheet badge",
    background: "The wide hero image behind the item sheet",
  } as const;

  const current = $derived(slot === "icon" ? item.image_url : item.background_url);

  let field = $state<HTMLInputElement | null>(null);
  let busy = $state(false);

  async function save(url: string | null): Promise<void> {
    busy = true;

    try {
      await updateRow("items", { id: item.id }, { [COLUMN[slot]]: url });
      announce(
        url === null
          ? `${LABEL[slot]} cleared for ${item.name}.`
          : `${LABEL[slot]} saved for ${item.name}.`,
        "good",
      );
      onsaved();
    } catch (error) {
      announce(message(error), "bad", 10000);
    } finally {
      busy = false;
    }
  }

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
        const shaped = svg ? await normalizeSvgFile(file) : file;
        const untouched = shaped === null;

        try {
          const asset = await uploadAsset("items", shaped ?? file);

          await updateRow("items", { id: item.id }, { [COLUMN[slot]]: asset.url });
          announce(
            untouched
              ? `${LABEL[slot]} saved for ${item.name}, but the art could not be measured, so it went up untouched and may sit off-centre.`
              : `${LABEL[slot]} saved for ${item.name}.`,
            untouched ? "info" : "good",
            untouched ? 10000 : 6000,
          );
          onsaved();
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
      <span class="none">none</span>
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
      <Button size="small" tone="ghost" {busy} onclick={() => void save(null)}>Clear</Button>
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
    gap: 12px;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--highlight);
  }

  .preview {
    display: grid;
    flex: none;
    width: 48px;
    height: 48px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--tertiary-normal);
    overflow: hidden;
    place-items: center;
  }

  .wide .preview {
    width: 84px;
  }

  .preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .none {
    color: var(--muted);
    font-family: var(--mono);
    font-size: 10px;
  }

  .about {
    flex: 1;
    min-width: 0;
  }

  .label {
    margin: 0;
    font-size: 12px;
    font-weight: 800;
  }

  .hint {
    margin: 1px 0 0;
    color: var(--tertiary);
    font-size: 11px;
    line-height: 1.4;
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
