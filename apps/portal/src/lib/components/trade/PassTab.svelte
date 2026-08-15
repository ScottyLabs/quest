<script lang="ts">
  import type { Order, Schemas } from "$lib/api/client";
  import { ApiError, api, message, unwrap } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Chip from "$lib/components/Chip.svelte";
  import Empty from "$lib/components/Empty.svelte";
  import Field from "$lib/components/Field.svelte";
  import Panel from "$lib/components/Panel.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import PassScanner from "$lib/components/trade/PassScanner.svelte";
  import { announce } from "$lib/notice.svelte";

  type Holder = Schemas["PassHolder"];
  type Lookup = { token?: string; andrew_id?: string };

  let { onchanged }: { onchanged: () => void } = $props();

  const REASONS: Record<string, string> = {
    pass_lookup_empty: "Scan a pass or type an Andrew ID first.",
    pass_token_malformed: "That QR code is not a Terrier Trade pass.",
    pass_signature: "That pass did not pass its signature check. It may be a forgery or expired.",
    user_unknown: "No user with that Andrew ID.",
    pass_holder_unknown: "That pass is not linked to a user any more.",
  };

  let holder = $state<Holder | null>(null);
  let asked = $state<Lookup | null>(null);
  let typed = $state("");
  let busy = $state(false);
  let working = $state<number | null>(null);
  let bulking = $state(false);
  let chosen = $state<number[]>([]);

  const sorted = $derived(
    [...(holder?.orders ?? [])].sort((left, right) => {
      const leftDone = (left.received_item_date ?? null) === null ? 0 : 1;
      const rightDone = (right.received_item_date ?? null) === null ? 0 : 1;

      return leftDone === rightDone ? right.purchase_id - left.purchase_id : leftDone - rightDone;
    }),
  );

  const waiting = $derived(sorted.filter((order) => (order.received_item_date ?? null) === null));
  const marked = $derived(chosen.filter((id) => waiting.some((order) => order.purchase_id === id)));

  function reason(error: unknown): string {
    if (error instanceof ApiError) return REASONS[error.code] ?? message(error);

    return message(error);
  }

  async function look(body: Lookup, quiet = false): Promise<void> {
    busy = true;

    try {
      const found = await unwrap(await api.POST("/api/portal/trade/pass", { body }));
      holder = found;
      asked = body;
      chosen = [];

      if (!quiet) {
        announce(
          found.verified
            ? `Pass verified for ${found.name}.`
            : `Showing ${found.name} from a typed Andrew ID.`,
          "good",
        );
      }
    } catch (error) {
      announce(reason(error), "bad", 10000);
    } finally {
      busy = false;
    }
  }

  async function again(): Promise<void> {
    if (asked === null) return;

    await look(asked, true);
    onchanged();
  }

  async function deliver(order: Order, delivered: boolean): Promise<void> {
    working = order.purchase_id;

    try {
      await unwrap(
        await api.PUT("/api/portal/trade/orders/{purchase_id}/delivery", {
          params: { path: { purchase_id: order.purchase_id } },
          body: { delivered },
        }),
      );

      announce(
        delivered ? `${order.item} marked resolved.` : `${order.item} put back to awaiting.`,
        "good",
      );
      await again();
    } catch (error) {
      announce(message(error), "bad", 10000);
    } finally {
      working = null;
    }
  }

  async function resolveMarked(): Promise<void> {
    const targets = marked.slice();
    if (targets.length === 0) return;

    bulking = true;

    const results = await Promise.allSettled(
      targets.map(async (id) =>
        unwrap(
          await api.PUT("/api/portal/trade/orders/{purchase_id}/delivery", {
            params: { path: { purchase_id: id } },
            body: { delivered: true },
          }),
        ),
      ),
    );

    const won = results.filter((result) => result.status === "fulfilled").length;

    announce(
      won === targets.length
        ? `Marked ${won} resolved.`
        : `Marked ${won} of ${targets.length} resolved. Try the rest again.`,
      won === targets.length ? "good" : "bad",
      9000,
    );

    await again();
    bulking = false;
  }

  function toggle(id: number, on: boolean): void {
    chosen = on ? [...chosen, id] : chosen.filter((entry) => entry !== id);
  }

  function reset(): void {
    holder = null;
    asked = null;
    chosen = [];
    typed = "";
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    const andrew = typed.trim();

    if (andrew === "") {
      announce(REASONS["pass_lookup_empty"] ?? "Type an Andrew ID.", "bad");
      return;
    }

    void look({ andrew_id: andrew });
  }
</script>

{#if holder === null}
  <Panel
    title="Scan a Terrier Trade pass"
    detail="Point the camera at the pass QR code. No camera, or no pass on them? Type the Andrew
      ID instead."
  >
    <div class="hero">
      <PassScanner paused={busy} onscan={(token) => void look({ token })} />

      <div class="manual">
        <form onsubmit={submit}>
          <Field label="Or enter an Andrew ID" hint="no pass needed">
            <input
              type="text"
              bind:value={typed}
              spellcheck="false"
              autocomplete="off"
              placeholder="e.g. jdoe"
            />
          </Field>

          <Button type="submit" {busy}>Look up</Button>
        </form>

        {#if busy}
          <Spinner label="Looking up the pass" />
        {/if}
      </div>
    </div>
  </Panel>
{:else}
  <Panel title={holder.name} detail="Andrew ID {holder.andrew_id}">
    {#snippet actions()}
      <Button tone="line" onclick={reset}>Scan someone else</Button>
    {/snippet}

    <div class="holder">
      <div class="who">
        {#if holder.verified}
          <Chip tone="good">Pass verified</Chip>
        {:else}
          <Chip tone="neutral">Not scanned</Chip>
        {/if}
        <Chip tone="accent">{holder.dorm ?? "no dorm"}</Chip>
      </div>

      <dl class="purse">
        <div>
          <dt>ScottyCoins</dt>
          <dd><span class="coin" aria-hidden="true"></span>{holder.scottycoins}</dd>
        </div>
        <div>
          <dt>Thistlestones</dt>
          <dd>{holder.thistlestones}</dd>
        </div>
      </dl>
    </div>
  </Panel>

  <div class="gap"></div>

  <Panel
    title="Their items"
    detail="Awaiting handover first. Tick several and resolve them in one go."
  >
    {#snippet actions()}
      <Button
        onclick={resolveMarked}
        disabled={marked.length === 0}
        busy={bulking}
      >
        Mark {marked.length} resolved
      </Button>
    {/snippet}

    {#if busy}
      <Spinner label="Refreshing their items" />
    {:else if sorted.length === 0}
      <Empty
        title="Nothing bought yet"
        detail="{holder.name} has not spent any ScottyCoins in Terrier Trade."
      />
    {:else}
      <ul class="items">
        {#each sorted as order (order.purchase_id)}
          {@const done = order.received_item_date ?? null}
          <li class:done={done !== null}>
            <label class="tick">
              <input
                type="checkbox"
                checked={marked.includes(order.purchase_id)}
                disabled={done !== null}
                onchange={(event) => toggle(order.purchase_id, event.currentTarget.checked)}
              />
              <span class="what">
                <span class="name">{order.item}</span>
                <span class="sub">
                  {order.quantity} &times; {order.cost} coins &middot; purchase {order.purchase_id}
                </span>
              </span>
            </label>

            <div class="right">
              {#if done === null}
                <Chip tone="warn">awaiting</Chip>
                <Button
                  size="small"
                  onclick={() => deliver(order, true)}
                  busy={working === order.purchase_id}
                >
                  Mark resolved
                </Button>
              {:else}
                <Chip tone="good">resolved {done}</Chip>
                <Button
                  size="small"
                  tone="ghost"
                  onclick={() => deliver(order, false)}
                  busy={working === order.purchase_id}
                >
                  Undo
                </Button>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>
{/if}

<style>
  .hero {
    display: grid;
    gap: 24px;
    align-items: start;
    grid-template-columns: minmax(18rem, 1fr) minmax(15rem, 20rem);
  }

  .manual {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: flex-start;
  }

  form :global(label) {
    width: 100%;
  }

  .holder {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: center;
    justify-content: space-between;
  }

  .who {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .purse {
    display: flex;
    gap: 28px;
    margin: 0;
  }

  dt {
    color: var(--tertiary);
    font-size: 12px;
    font-weight: 700;
  }

  dd {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 2px 0 0;
    font-size: 24px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .coin {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--coin);
  }

  .gap {
    height: 20px;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }

  li.done {
    background: var(--canvas);
  }

  .tick {
    display: flex;
    gap: 12px;
    align-items: center;
    min-width: 0;
    cursor: pointer;
  }

  .tick input {
    width: 18px;
    height: 18px;
    flex: none;
  }

  .what {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .name {
    font-size: 15px;
    font-weight: 700;
  }

  .sub {
    color: var(--tertiary);
    font-size: 12px;
  }

  .right {
    display: flex;
    flex: none;
    gap: 10px;
    align-items: center;
  }
</style>
