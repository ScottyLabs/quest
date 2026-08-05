<script lang="ts">
  import { session } from "$lib/auth";
  import { diagnose, type Diagnosis } from "$lib/diagnose";

  // No auth guard on purpose: this has to be reachable when sign-in is
  // exactly what is broken.
  let checks = $state<Diagnosis | null>(null);
  let running = $state(false);

  async function run() {
    running = true;
    checks = await diagnose();
    running = false;
  }

  run();
</script>

<div class="page">
  <h1>Device diagnostics</h1>

  <pre>{checks
      ? Object.entries(checks)
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join("\n")
      : running
        ? "running…"
        : "—"}</pre>

  <pre>signedIn: {session.signedIn}
phase: {session.phase}
deviceOwned: {session.deviceOwned}</pre>

  <div class="row">
    <button onclick={run}>Re-run</button>
  </div>
</div>

<style>
  .page {
    padding: calc(24px + env(safe-area-inset-top)) 16px 24px;
    font-family: ui-monospace, monospace;
    background: var(--highlight);
    min-height: 100dvh;
  }

  h1 {
    margin: 0 0 12px;
    font-size: 16px;
    font-family: system-ui, sans-serif;
  }

  pre {
    margin: 0 0 12px;
    padding: 10px;
    border-radius: 8px;
    background: var(--tertiary-normal);
    font-size: 11px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .row {
    display: flex;
    gap: 8px;
  }

  button {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 999px;
    background: var(--primary);
    color: var(--highlight);
    font: inherit;
    font-weight: 600;
  }
</style>
