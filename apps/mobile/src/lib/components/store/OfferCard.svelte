<script lang="ts">
  let {
    name,
    cost,
    claimed,
    stock,
    art,
  }: {
    name: string;
    cost: number;
    claimed: [number, number];
    stock: number;
    art: string;
  } = $props();
</script>

<article>
  <div class="detail">
    <h2>{name}</h2>

    <dl>
      <dt>Cost:</dt>
      <dd>{cost} ScottyCoins</dd>
      <dt>Claimed:</dt>
      <dd>{claimed[0]}/{claimed[1]}</dd>
      <dt>Stock:</dt>
      <dd>{stock}</dd>
    </dl>
  </div>

  <img src={art} alt="" width="71" height="65" />
</article>

<style>
  article {
    display: flex;
    align-items: center;
    gap: 17px;
    width: 100%;
    max-width: 343px;
    padding: 12px 17px;
    border-radius: 10px;
    background: var(--highlight);
    filter: drop-shadow(0 0 2px rgb(0 0 0 / 25%));
  }

  .detail {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  h2 {
    margin: 0;
    color: var(--secondary);
    font-size: 24px;
    font-weight: 800;
    letter-spacing: 0.48px;
  }

  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0 4px;
    margin: 0;
    color: var(--tertiary);
    font-size: 13px;
    letter-spacing: 0.26px;
  }

  dt {
    font-weight: 400;
  }

  dd {
    margin: 0;
    font-weight: 700;
  }

  img {
    flex: none;
    width: 71px;
    height: 65px;
    border-radius: 5px;
    object-fit: cover;
  }
</style>
