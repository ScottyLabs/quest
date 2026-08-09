<script lang="ts">
  let { label }: { label: string } = $props();
</script>

<p class="rule">
  <span aria-hidden="true"></span>
  {label}
  <span aria-hidden="true"></span>
</p>

<style>
  .rule {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: calc(12 * var(--u));
    margin: calc(10 * var(--u)) 0 0;
    color: var(--secondary);
    font-size: calc(16 * var(--u));
    font-weight: 700;
    letter-spacing: calc(0.32 * var(--u));
  }

  span {
    flex: none;
    width: calc(80 * var(--u));
    height: calc(3 * var(--u));
    border-radius: calc(1.5 * var(--u));
    background: #1d1515;
  }
</style>
