<script lang="ts">
  import "../app.css";
  import { session } from "$lib/auth";

  let { children } = $props();

  // Must run before anything reads `session.user`.
  session.restore();
</script>

{@render children()}
