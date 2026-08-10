<script lang="ts">
  let { label, value }: { label: string; value: string } = $props();
</script>

<div class="field">
  <span class="label">{label}</span>
  <span class="value">{value}</span>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .label {
    color: var(--secondary);
    font-size: calc(10 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.5 * var(--u));
    line-height: calc(15 * var(--u));
    text-transform: uppercase;
  }

  .value {
    overflow: hidden;
    color: var(--secondary);
    font-size: calc(14 * var(--u));
    font-weight: 400;
    line-height: calc(19 * var(--u));
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
