<script lang="ts">
  let { title, icon }: { title: string; icon: string } = $props();
</script>

<section>
  <img src={icon} alt="" height="64" />
  <h1>{title}</h1>
  <p>Coming soon.</p>
</section>

<style>
  section {
    display: grid;
    flex: 1;
    align-content: start;
    justify-items: center;
    gap: 8px;
    min-height: 0;
    padding: calc(80px + env(safe-area-inset-top)) 24px 110px;
    overflow-y: auto;
    text-align: center;
  }

  img {
    width: auto;
  }

  h1 {
    margin: 0;
    color: var(--highlight);
    font-size: 21px;
    font-weight: 700;
    letter-spacing: 0.48px;
  }

  p {
    margin: 0;
    color: var(--shade);
    font-size: 15px;
    font-weight: 600;
  }
</style>
