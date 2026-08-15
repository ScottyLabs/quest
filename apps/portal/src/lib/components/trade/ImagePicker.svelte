<script lang="ts">
  import type { ShopItem } from "$lib/api/client";
  import { message, uploadAsset } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import { announce } from "$lib/notice.svelte";
  import { updateRow } from "$lib/rows";

  let { item, onsaved }: { item: ShopItem; onsaved: () => void } = $props();

  const LIMIT = 8 * 1024 * 1024;

  let field = $state<HTMLInputElement | null>(null);
  let busy = $state(false);

  async function picked(event: Event & { currentTarget: HTMLInputElement }): Promise<void> {
    const file = event.currentTarget.files?.[0];
    if (file === undefined) return;

    if (!file.type.startsWith("image/")) {
      announce("That is not an image. Pick a png, jpeg or webp.", "bad");
      return;
    }

    if (file.size > LIMIT) {
      announce("That image is larger than the 8 MiB limit.", "bad");
      return;
    }

    busy = true;

    try {
      const asset = await uploadAsset("items", file);

      await updateRow("items", { id: item.id }, { image_url: asset.url });
      announce(`New image saved for ${item.name}.`, "good");
      onsaved();
    } catch (error) {
      announce(message(error), "bad", 10000);
    } finally {
      busy = false;
      if (field !== null) field.value = "";
    }
  }
</script>

<Button
  size="small"
  tone="line"
  {busy}
  title="Upload a picture and set it as this item's image"
  onclick={() => field?.click()}
>
  Upload image
</Button>

<input bind:this={field} type="file" accept="image/*" onchange={picked} />

<style>
  input {
    display: none;
  }
</style>
