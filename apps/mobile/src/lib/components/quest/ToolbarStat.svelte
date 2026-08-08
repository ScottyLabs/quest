<script lang="ts">
  let {
    icon,
    label,
    value,
    width,
    height,
  }: {
    icon: string;
    label: string;
    value: string;
    width: number;
    height: number;
  } = $props();
</script>

<p
  class="stat"
  aria-label="{label}: {value}"
  style:--w="calc({width} * var(--u))"
  style:--h="calc({height} * var(--u))"
>
  <img src={icon} alt="" />
  <span>{value}</span>
</p>

<style>
  .stat {
    display: flex;
    flex: none;
    align-items: center;
    gap: calc(4 * var(--u));
    margin: 0;
    color: var(--ink-shade);
    font-size: calc(20 * var(--u));
    font-weight: 600;
    white-space: nowrap;
  }

  img {
    display: block;
    width: var(--w);
    height: var(--h);
    object-fit: contain;
  }
</style>
