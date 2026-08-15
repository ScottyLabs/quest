<script lang="ts">
  import Panel from "$lib/components/Panel.svelte";

  let { onpick }: { onpick: (sql: string) => void } = $props();

  const STARTERS: { name: string; detail: string; sql: string }[] = [
    {
      name: "Leaderboard",
      detail: "Taps and earned coins per Andrew ID",
      sql: `SELECT u.andrew_id, count(*) AS taps, sum(c.coin_value) AS coins
FROM tap_events t
JOIN users u ON u.id = t.user_id
JOIN challenge c ON c.id = t.challenge_id
GROUP BY 1
ORDER BY 3 DESC
LIMIT 20`,
    },
    {
      name: "Orders awaiting handover",
      detail: "Terrier Trade purchases with no received date",
      sql: `SELECT p.purchase_id, u.andrew_id, i.name AS item, p.quantity, i.cost
FROM purchases p
JOIN users u ON u.id = p.user_id
JOIN items i ON i.id = p.item_id
WHERE p.received_item_date IS NULL
ORDER BY p.purchase_id
LIMIT 100`,
    },
    {
      name: "Challenges not open yet",
      detail: "Hidden in the app until open_from passes",
      sql: `SELECT id, name, category, open_from, coin_value
FROM challenge
WHERE open_from > now()
ORDER BY open_from`,
    },
    {
      name: "Live cards with no location",
      detail: "Placed cards still missing coordinates",
      sql: `SELECT c.card_id, ch.name AS challenge, c.created_at
FROM challenge_card c
JOIN challenge ch ON ch.id = c.challenge_id
WHERE c.location IS NULL AND c.retired_at IS NULL
ORDER BY c.created_at DESC`,
    },
    {
      name: "Biggest tables",
      detail: "Planner row estimates straight from pg_class",
      sql: `SELECT relname AS table_name, reltuples::bigint AS row_estimate,
       pg_size_pretty(pg_total_relation_size(oid)) AS total_size
FROM pg_class
WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace
ORDER BY reltuples DESC
LIMIT 20`,
    },
  ];
</script>

<Panel title="Snippets" detail="Read-only starters for this schema">
  <ul>
    {#each STARTERS as starter (starter.name)}
      <li>
        <button type="button" title={starter.sql} onclick={() => onpick(starter.sql)}>
          <span class="name">{starter.name}</span>
          <span class="detail">{starter.detail}</span>
        </button>
      </li>
    {/each}
  </ul>
</Panel>

<style>
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    border-bottom: 1px solid var(--line);
  }

  li:last-child {
    border-bottom: 0;
  }

  button {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    padding: 9px 0;
    border: 0;
    background: none;
    text-align: left;
    cursor: pointer;
  }

  .name {
    color: var(--secondary);
    font-size: 13px;
    font-weight: 700;
  }

  .detail {
    color: var(--tertiary);
    font-size: 12px;
  }

  button:hover .name {
    color: var(--accent);
  }
</style>
