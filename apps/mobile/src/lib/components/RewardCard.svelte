<script lang="ts">
  // TODO: placeholder. Backfill from Figma 484:14437 (Tartan T-Shirt) and
  // 733:23536 (Terrier Scarf progress) once the shared UI components exist.
  let { label }: { label: string } = $props();
</script>

<div class="card">
  <span>{label}</span>
</div>

<style>
  .card {
    display: grid;
    place-items: center;
    width: 331px;
    height: 102px;
    border-radius: 10px;
    background: var(--tertiary-normal);
    box-shadow: 0 0 2px rgb(0 0 0 / 0.25);
    color: var(--tertiary);
    font-size: 15px;
    font-weight: 600;
  }
</style>
