<script lang="ts">
  let { title, detail }: { title: string; detail?: string } = $props();
</script>

<div class="wrap">
  <p class="title">{title}</p>
  {#if detail !== undefined}<p class="detail">{detail}</p>{/if}
</div>

<style>
  .wrap {
    padding: 40px 20px;
    text-align: center;
  }

  .title {
    margin: 0;
    color: var(--ink-shade);
    font-size: 14px;
    font-weight: 700;
  }

  .detail {
    margin: 4px 0 0;
    color: var(--tertiary);
    font-size: 13px;
  }
</style>
