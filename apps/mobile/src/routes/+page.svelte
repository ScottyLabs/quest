<script lang="ts">
  import { Capacitor } from "@capacitor/core";

  const platform = Capacitor.getPlatform();
  const native = Capacitor.isNativePlatform();
</script>

<h1>Welcome to Capacitor</h1>

<p class="lede">SvelteKit static build running in a Capacitor shell.</p>

<dl>
  <dt>Platform</dt>
  <dd>{platform}</dd>
  <dt>Native shell</dt>
  <dd>{native ? "yes" : "no"}</dd>
</dl>

<style>
  h1 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
    line-height: 1.1;
  }

  .lede {
    margin: 0 0 1.5rem;
    color: var(--muted);
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem 1rem;
    margin: 0;
    padding: 1rem;
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    background: var(--card);
  }

  dt {
    color: var(--muted);
  }

  dd {
    margin: 0;
  }
</style>
