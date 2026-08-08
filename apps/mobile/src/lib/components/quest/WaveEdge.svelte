<script lang="ts">
  const SHAPES = {
    veil: {
      box: "0 0 439 274",
      d: "M-2.9234 -113H453.512L473 273.414C272.284 281.912 168.702 193.931 -19 273.414L-2.9234 -113Z",
    },
    band: {
      box: "0 0 439 361",
      d: "M-11.9234 -66H444.512L464 360.353C263.284 369.73 159.702 272.656 -28 360.353L-11.9234 -66Z",
    },
  } as const;

  let { shape }: { shape: keyof typeof SHAPES } = $props();

  const wave = $derived(SHAPES[shape]);
</script>

<svg class="wave" viewBox={wave.box} preserveAspectRatio="none" aria-hidden="true">
  <path d={wave.d} fill="currentColor" />
</svg>

<style>
  .wave {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
