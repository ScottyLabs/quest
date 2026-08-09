<script lang="ts">
  const SHAPES = {
    veil: {
      box: "0 0 439 296",
      d: "M-2.9234 -113H453.512L473 294C370 296 170 188 -19 273.414L-2.9234 -113Z",
    },
    band: {
      box: "0 0 439 361",
      d: "M-11.9234 -66H444.512L464 360.353C263.284 369.73 159.702 272.656 -28 360.353L-11.9234 -66Z",
    },
    crown: {
      box: "0 0 492 427",
      d: "M16.0766 0H472.512L492 426.353C291.284 435.73 187.703 338.656 0 426.353L16.0766 0Z",
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
