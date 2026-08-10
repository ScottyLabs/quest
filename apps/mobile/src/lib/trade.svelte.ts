import { api } from "$lib/api/client";
import type { components } from "$lib/api/schema";
import { Resource } from "$lib/cache.svelte";

export const PICKUP = "Community Life Office in Morewood Gardens";

export type TradeTab = "shop" | "receipt" | "ticket";

export const TABS: { id: TradeTab; label: string }[] = [
  { id: "shop", label: "Shop" },
  { id: "receipt", label: "Receipt" },
  { id: "ticket", label: "Ticket" },
];

export const tab = $state<{ id: TradeTab }>({ id: "shop" });

export function openTab(id: TradeTab): void {
  tab.id = id;
}

export interface Offer {
  id: string;
  name: string;
  description: string;
  cost: number;
  stock: number;
  art: string | null;
}

type ItemView = components["schemas"]["ItemView"];

type Shelf = components["schemas"]["Shelf"];

const TTL = 5 * 60 * 1000;

async function load(): Promise<Offer[]> {
  const { data, response } = await api.GET("/api/items");
  if (!response.ok || !data) throw new Error(`items responded ${response.status}`);

  const body: Shelf = data;

  return body.items.map((row: ItemView) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    cost: row.cost,
    stock: row.stock,
    art: row.image_url ?? null,
  }));
}

function revive(raw: unknown): Offer[] | null {
  return Array.isArray(raw) ? (raw as Offer[]) : null;
}

export const offers = new Resource<Offer[]>({
  key: "quest.cache.items",
  ttl: TTL,
  load,
  revive,
});

export interface Purchase {
  id: number;
  itemId: string;
  name: string;
  quantity: number;
  cost: number;
  delivered: boolean;
}

type PurchaseView = components["schemas"]["PurchaseView"];

type Ledger = components["schemas"]["Wallet"];

async function loadPurchases(): Promise<Purchase[]> {
  const { data, response } = await api.GET("/api/users/me/purchases");
  if (!response.ok || !data) throw new Error(`purchases responded ${response.status}`);

  const body: Ledger = data;

  return body.purchases.map((row: PurchaseView) => ({
    id: row.purchase_id,
    itemId: row.item_id,
    name: row.name,
    quantity: row.quantity,
    cost: row.cost,
    delivered: row.delivered,
  }));
}

function revivePurchases(raw: unknown): Purchase[] | null {
  return Array.isArray(raw) ? (raw as Purchase[]) : null;
}

export const purchases = new Resource<Purchase[]>({
  key: "quest.cache.purchases",
  ttl: TTL,
  load: loadPurchases,
  revive: revivePurchases,
});

export type Bought = components["schemas"]["Purchased"];

export class TradeError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export async function purchase(id: string, quantity: number): Promise<Bought> {
  const { data, error, response } = await api.POST("/api/items/{id}/purchase", {
    params: { path: { id } },
    body: { quantity },
  });
  if (!response.ok || !data) throw new TradeError(error?.error ?? "unknown");

  await Promise.all([offers.reload(), purchases.reload()]);

  return data;
}

export async function refund(id: number, quantity: number): Promise<void> {
  const { error, response } = await api.POST("/api/purchases/{id}/refund", {
    params: { path: { id } },
    body: { quantity },
  });
  if (!response.ok) throw new TradeError(error?.error ?? "unknown");

  await Promise.all([offers.reload(), purchases.reload()]);
}
