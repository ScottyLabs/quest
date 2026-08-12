<script lang="ts">
  let { onback, onskip }: { onback?: () => void; onskip?: () => void } = $props();
</script>

<div class="topbar">
  {#if onback !== undefined}
    <button class="arrow" onclick={onback} aria-label="Back">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path
          d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z"
          fill="currentColor"
        />
      </svg>
    </button>
  {/if}
  {#if onskip !== undefined}
    <button class="skip" onclick={onskip}>Skip</button>
  {/if}
</div>

<style>
  .topbar {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    height: 24px;
    padding: 0 16px;
  }
  .arrow {
    display: grid;
    padding: 0;
    border: 0;
    background: none;
    color: var(--secondary);
    cursor: pointer;
    place-items: center;
  }
  .skip {
    margin-left: auto;
    padding: 0;
    border: 0;
    background: none;
    color: var(--muted);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.26px;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
