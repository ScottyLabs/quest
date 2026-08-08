<script lang="ts">
  import type { Snippet } from "svelte";
  let { children }: { children: Snippet } = $props();
</script>

<div class="mark">
  <img class="halo" src="/img/quest/daily/halo.svg" alt="" />
  <img class="head" src="/img/quest/daily/scotty.svg" alt="" />

  {@render children()}

  <img class="scarf" src="/img/quest/daily/scarf.svg" alt="" />
  <img class="spark-lg" src="/img/quest/daily/spark-lg.svg" alt="" />
  <img class="spark-lg-core" src="/img/quest/daily/spark-lg-core.svg" alt="" />
  <img class="seal" src="/img/quest/daily/seal.svg" alt="" />
  <img class="seal-core" src="/img/quest/daily/seal-core.svg" alt="" />
  <img class="seal-shine" src="/img/quest/daily/seal-shine.svg" alt="" />
  <img class="spark-sm" src="/img/quest/daily/spark-sm.svg" alt="" />
  <img class="spark-md" src="/img/quest/daily/spark-md.svg" alt="" />
  <img class="spark-md-core" src="/img/quest/daily/spark-md-core.svg" alt="" />
</div>

<style>
  .mark {
    position: relative;
  }

  .mark > img {
    position: absolute;
    display: block;
    pointer-events: none;
  }

  .halo {
    top: calc(-60.8 * var(--u));
    left: calc(35 * var(--u));
    width: calc(80.4 * var(--u));
    height: calc(83.5 * var(--u));
  }

  .head {
    top: calc(-62 * var(--u));
    left: calc(26.6 * var(--u));
    width: calc(91 * var(--u));
    height: calc(88 * var(--u));
  }

  .scarf {
    top: calc(-31.1 * var(--u));
    left: calc(57 * var(--u));
    width: calc(46 * var(--u));
    height: calc(52 * var(--u));
  }

  .spark-lg {
    top: calc(16 * var(--u));
    left: calc(10 * var(--u));
    width: calc(18.5 * var(--u));
    height: calc(23 * var(--u));
  }

  .spark-lg-core {
    top: calc(18 * var(--u));
    left: calc(12 * var(--u));
    width: calc(14 * var(--u));
    height: calc(18 * var(--u));
  }

  .spark-sm {
    top: calc(40 * var(--u));
    left: calc(74 * var(--u));
    width: calc(9 * var(--u));
    height: calc(12 * var(--u));
  }

  .spark-md {
    top: calc(63.5 * var(--u));
    left: calc(46.5 * var(--u));
    width: calc(11.5 * var(--u));
    height: calc(18 * var(--u));
  }

  .spark-md-core {
    top: calc(67 * var(--u));
    left: calc(48 * var(--u));
    width: calc(9 * var(--u));
    height: calc(12 * var(--u));
  }

  .seal {
    top: calc(44.3 * var(--u));
    left: calc(50.2 * var(--u));
    width: calc(32.6 * var(--u));
    height: calc(34.4 * var(--u));
  }

  .seal-core {
    top: calc(47 * var(--u));
    left: calc(53 * var(--u));
    width: calc(27 * var(--u));
    height: calc(29 * var(--u));
  }

  .seal-shine {
    top: calc(61.5 * var(--u));
    left: calc(53 * var(--u));
    width: calc(27 * var(--u));
    height: calc(14.5 * var(--u));
  }
</style>
