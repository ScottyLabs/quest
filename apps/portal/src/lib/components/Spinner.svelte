<script lang="ts">
  let { label = "Loading" }: { label?: string } = $props();
</script>

<div class="wrap" role="status">
  <span class="ring" aria-hidden="true"></span>
  <span class="label">{label}</span>
</div>

<style>
  .wrap {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
    padding: 32px;
    color: var(--tertiary);
    font-size: 13px;
  }

  .ring {
    width: 15px;
    height: 15px;
    border: 2px solid var(--tint);
    border-radius: 50%;
    border-top-color: var(--accent);
    animation: turn 0.7s linear infinite;
  }

  @keyframes turn {
    to {
      transform: rotate(1turn);
    }
  }
</style>
