import { authFetch } from "$lib/auth";
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

interface ItemView {
  id: string;
  name: string;
  description: string;
  cost: number;
  image_url: string | null;
  stock: number;
}

interface Shelf {
  items: ItemView[];
}

const TTL = 5 * 60 * 1000;

async function load(): Promise<Offer[]> {
  const response = await authFetch("/api/items");
  if (!response.ok) throw new Error(`items responded ${response.status}`);

  const body = (await response.json()) as Shelf;

  return body.items.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    cost: row.cost,
    stock: row.stock,
    art: row.image_url,
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

interface PurchaseView {
  purchase_id: number;
  item_id: string;
  name: string;
  quantity: number;
  cost: number;
  delivered: boolean;
}

interface Ledger {
  purchases: PurchaseView[];
}

async function loadPurchases(): Promise<Purchase[]> {
  const response = await authFetch("/api/users/me/purchases");
  if (!response.ok) throw new Error(`purchases responded ${response.status}`);

  const body = (await response.json()) as Ledger;

  return body.purchases.map((row) => ({
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

export interface Bought {
  name: string;
  quantity: number;
  spent: number;
  scottycoins: number;
}

export class TradeError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export async function purchase(id: string, quantity: number): Promise<Bought> {
  const response = await authFetch(`/api/items/${id}/purchase`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  if (!response.ok) {
    const failed = (await response.json().catch(() => ({}))) as { error?: string };
    throw new TradeError(failed.error ?? "unknown");
  }

  const body = (await response.json()) as Bought;

  await Promise.all([offers.reload(), purchases.reload()]);

  return body;
}

export async function refund(id: number, quantity: number): Promise<void> {
  const response = await authFetch(`/api/purchases/${id}/refund`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  if (!response.ok) {
    const failed = (await response.json().catch(() => ({}))) as { error?: string };
    throw new TradeError(failed.error ?? "unknown");
  }

  await Promise.all([offers.reload(), purchases.reload()]);
}
