<script lang="ts">
  let { size = 163, alt = "ScottyCoin" }: { size?: number; alt?: string } = $props();
</script>

<img src="/img/scottycoin.svg" width={size} height={size} {alt} />

<style>
  img {
    display: block;
    object-fit: contain;
  }
</style>
