<script lang="ts">
  import type { ShopItem } from "$lib/api/client";
  import { ApiError, api, message, unwrap } from "$lib/api/client";
  import Button from "$lib/components/Button.svelte";
  import Empty from "$lib/components/Empty.svelte";
  import Field from "$lib/components/Field.svelte";
  import Panel from "$lib/components/Panel.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { announce } from "$lib/notice.svelte";
  import { SvelteMap } from "svelte/reactivity";

  let {
    items,
    loading,
    fault,
    onbought,
  }: {
    items: ShopItem[];
    loading: boolean;
    fault: string | null;
    onbought: () => void;
  } = $props();

  const REASONS: Record<string, string> = {
    user_unknown: "No user with that Andrew ID.",
    item_unknown: "That item is no longer in the catalog.",
    out_of_stock: "There is not enough stock left for that quantity.",
    insufficient_coins: "They don't have enough ScottyCoins.",
    quantity_invalid: "That quantity is not a whole number of units.",
    option_missing: "Fill in every required choice for this item.",
    option_answer_invalid: "One of those choices is not offered any more. Reload the tab.",
    option_answer_too_long: "Keep a written answer to 120 characters or fewer.",
    option_unknown: "This item's choices just changed. Reload the tab.",
    option_id_invalid: "This item's choices just changed. Reload the tab.",
  };

  let andrew = $state("");
  let chosen = $state("");
  let quantity = $state<number | null>(1);
  let busy = $state(false);
  let balance = $state<number | null>(null);
  let balanceBusy = $state(false);
  let balanceFault = $state<string | null>(null);
  const answers = new SvelteMap<string, string>();

  const picked = $derived(items.find((item) => item.id === chosen) ?? null);
  const ceiling = $derived(Math.max(picked?.stock ?? 1, 1));
  const wanted = $derived(Math.min(Math.max(Math.trunc(quantity ?? 1) || 1, 1), ceiling));
  const total = $derived((picked?.cost ?? 0) * wanted);

  const options = $derived(picked?.options ?? []);

  const unanswered = $derived(
    options.filter((option) => option.required && (answers.get(option.id) ?? "").trim() === ""),
  );

  const unavailableChoice = $derived(
  options.some((option) => {
    if (option.kind === "text") return false;

    const selected = answers.get(option.id);

    if (selected === undefined || selected === "") {
      return false;
    }

    const choice = option.choices.find(
      (choice) => choice.value === selected,
    );

    return (
      choice?.stock !== null &&
      choice?.stock !== undefined &&
      choice.stock < wanted
    );
  }),
);

  const ready = $derived(
  andrew.trim().length > 0 &&
    picked !== null &&
    picked.stock > 0 &&
    wanted <= picked.stock &&
    unanswered.length === 0 &&
    !unavailableChoice,
);

  function retarget(): void {
    answers.clear();
  }

  function reason(error: unknown): string {
    if (error instanceof ApiError) return REASONS[error.code] ?? message(error);

    return message(error);
  }

  async function loadBalance(): Promise<void> {
    const wanted = andrew.trim().toLowerCase();

    balance = null;
    balanceFault = null;

    if (wanted === "") {
      return;
    }

    balanceBusy = true;

    try {
      const result = await unwrap(
        await api.GET("/api/portal/trade/balance/{andrew_id}", {
          params: {
            path: {
              andrew_id: wanted,
            },
          },
        }),
      );

      balance = result.scottycoins;
    } catch (error) {
      balanceFault = message(error);
    } finally {
      balanceBusy = false;
    }
  }

  async function sell(): Promise<void> {
    if (picked === null) return;

    busy = true;
    const payload = {
      andrew_id: andrew.trim(),
      item_id: picked.id,
      quantity: wanted,
      options: options
        .map((option) => ({ option_id: option.id, value: (answers.get(option.id) ?? "").trim() }))
        .filter((pick) => pick.value !== ""),
    };

    try {
      const bought = await unwrap(await api.POST("/api/portal/trade/orders", { body: payload }));
      balance = bought.scottycoins;
      const sold = `${bought.quantity} \u00d7 ${bought.item}`;
      const how =
        bought.options.length > 0
          ? ` (${bought.options.map((pick) => `${pick.label} ${pick.value}`).join(", ")})`
          : "";
      
      announce(
        `Sold ${sold}${how} to ${payload.andrew_id} for ${bought.spent} coins.` +
          ` They have ${bought.scottycoins} ScottyCoins left.`,
        "good",
        9000,
      );
      quantity = 1;
      retarget();
      onbought();
    } catch (error) {
      announce(reason(error), "bad", 10000);
    } finally {
      busy = false;
    }
  }
</script>

<Panel
  title="Sell at the counter"
  detail="Runs the same purchase path the app uses, so stock and balances stay honest. The coins
    come out of the student's balance immediately."
>
  {#if loading}
    <Spinner label="Loading the catalog" />
  {:else if fault !== null}
    <Empty title="The catalog did not load" detail={fault} />
  {:else if items.length === 0}
    <Empty title="Nothing to sell" detail="Stock an item before running a purchase." />
  {:else}
    <div class="form">
      <Field label="Andrew ID" hint="the buyer">
        <input
          type="text"
          placeholder="e.g. jdoe"
          bind:value={andrew}
          oninput={() => {
            balance = null;
            balanceFault = null;
          }}
          onblur={() => void loadBalance()}
        />
        {#if balanceBusy}
          <p class="balance">Checking balance...</p>
        {:else if balance !== null}
          <p class="balance">
            Current balance:
            <strong>{balance} ScottyCoins</strong>
          </p>
        {:else if balanceFault !== null}
          <p class="balance bad">{balanceFault}</p>
        {/if}
      </Field>

      <Field label="Item">
        <select bind:value={chosen} onchange={retarget}>
          <option value="">Pick an item</option>
          {#each items as item (item.id)}
            <option value={item.id} disabled={item.stock <= 0}>
              {item.name} &mdash; {item.cost} coins ({item.stock} left)
            </option>
          {/each}
        </select>
      </Field>

      <Field label="Quantity" hint={picked === null ? "pick an item" : `max ${picked.stock}`}>
        <input type="number" min="1" max={ceiling} step="1" bind:value={quantity} />
      </Field>
    </div>

    {#if options.length > 0}
      <div class="picks">
        {#each options as option (option.id)}
          <Field
            label={option.label}
            hint={option.required ? "required" : "optional"}
          >
            {#if option.kind === "text"}
              <input
                type="text"
                maxlength="120"
                autocomplete="off"
                value={answers.get(option.id) ?? ""}
                oninput={(event) => answers.set(option.id, event.currentTarget.value)}
              />
            {:else}
              <select
                value={answers.get(option.id) ?? ""}
                onchange={(event) => answers.set(option.id, event.currentTarget.value)}
              >
                <option value="">{option.required ? `Choose ${option.label}` : "No preference"}</option>
                {#each option.choices as choice (choice.value)}
                  <option
                    value={choice.value}
                    disabled={choice.stock !== null &&
                      choice.stock !== undefined &&
                      choice.stock < wanted}
                  >
                    {choice.value}
                    {#if choice.stock !== null && choice.stock !== undefined}
                      ({choice.stock} left)
                    {/if}
                  </option>
                {/each}
              </select>
            {/if}
          </Field>
        {/each}
      </div>
    {/if}

    <div class="close">
      <div class="total">
        <span class="label">Total</span>
        <strong><span class="coin" aria-hidden="true"></span>{total}</strong>
        <span class="sum">
          {#if picked === null}
            Pick an item to price this up.
          {:else}
            {wanted} &times; {picked.cost} coins
          {/if}
        </span>
      </div>

      <Button onclick={sell} disabled={!ready} {busy}>Run purchase</Button>
    </div>
  {/if}
</Panel>

<style>
  .picks {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    margin: 14px 0 0;
    padding: 14px 16px;
    border-radius: var(--radius);
    background: var(--canvas);
  }

  .form {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
  }

  .close {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin: 18px 0 0;
    padding: 14px 16px;
    border-radius: var(--radius);
    background: var(--canvas);
  }

  .total {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .total .label {
    color: var(--ink-shade);
    font-size: 12px;
    font-weight: 700;
  }

  .total strong {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    font-size: 26px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

    .balance {
    margin: 4px 0 0;
    color: var(--tertiary);
    font-size: 12px;
  }

  .balance strong {
    color: var(--ink);
    font-weight: 800;
  }

  .balance.bad {
    color: var(--bad);
  }

  .coin {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--coin);
  }

  .sum {
    color: var(--tertiary);
    font-size: 12px;
    font-weight: 400;
  }
</style>
