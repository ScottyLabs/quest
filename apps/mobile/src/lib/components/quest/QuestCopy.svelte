<script lang="ts">
  let { title, detail }: { title: string; detail?: string } = $props();
</script>

<span class="copy">
  <span class="title">{title}</span>
  {#if detail}<span class="detail">{detail}</span>{/if}
</span>

<style>
  .copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: calc(8 * var(--u));
    min-width: 0;
  }

  .title {
    overflow: hidden;
    color: var(--secondary);
    font-size: calc(16 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.32 * var(--u));
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail {
    display: -webkit-box;
    overflow: hidden;
    color: var(--tertiary);
    font-size: calc(12 * var(--u));
    font-weight: 600;
    letter-spacing: calc(0.24 * var(--u));
    -webkit-box-orient: vertical;
    line-clamp: 2;
    -webkit-line-clamp: 2;
  }
</style>
