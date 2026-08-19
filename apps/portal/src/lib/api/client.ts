import createClient from "openapi-fetch";
import { session } from "$lib/session.svelte";
import type { components, paths } from "./schema";

const configured: unknown = import.meta.env.VITE_QUEST_API_BASE;

export const apiBase =
  typeof configured === "string" && configured.length > 0 ? configured.replace(/\/$/u, "") : "";

export const apiUrl = (path: string): string =>
  `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, detail?: string) {
    super(detail ?? code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function failure(response: Response, body: unknown): ApiError {
  let code = "request_failed";
  let detail: string | undefined;

  if (body !== null && typeof body === "object") {
    const shaped = body as { error?: unknown; detail?: unknown };
    if (typeof shaped.error === "string") code = shaped.error;
    if (typeof shaped.detail === "string") detail = shaped.detail;
  }

  if (code === "request_failed" && detail === undefined) {
    detail = response.statusText.length > 0 ? response.statusText : undefined;
  }

  return new ApiError(response.status, code, detail);
}

async function portalRequest(request: Request): Promise<Response> {
  const headers = new Headers(request.headers);
  const id = session.id;

  if (id !== null) headers.set("authorization", `Bearer ${id}`);

  let response: Response;

  try {
    response = await fetch(new Request(request, { credentials: "include", headers }));
  } catch {
    throw new ApiError(0, "network", "could not reach the backend");
  }

  if (response.status === 401) session.clear();

  return response;
}

export const api = createClient<paths>({ baseUrl: apiBase || "/", fetch: portalRequest });

export type Schemas = components["schemas"];

export type Identity = Schemas["Identity"];
export type Capability = Schemas["Capability"];
export type Role = Schemas["Role"];
export type Level = Schemas["Level"];
export type TableView = Schemas["TableView"];
export type PortalColumn = Schemas["Column"];
export type Page = Schemas["Page"];
export type Outcome = Schemas["Outcome"];
export type Written = Schemas["Written"];
export type OrderView = Schemas["OrderView"];
export type ShopItem = Schemas["ShopItem"];
export type Bought = Schemas["Bought"];
export type GaveBack = Schemas["GaveBack"];
export type Fulfilled = Schemas["Fulfilled"];
export type PassHolder = Schemas["PassHolder"];
export type Script = Schemas["Script"];
export type Step = Schemas["Step"];
export type Uploaded = Schemas["Uploaded"];
export type AssetLibrary = Schemas["Library"];
export type AssetView = Schemas["AssetView"];

export async function uploadAsset(kind: string, file: File): Promise<Uploaded> {
  const headers = new Headers({ "content-type": file.type || "application/octet-stream" });
  const id = session.id;

  if (id !== null) headers.set("authorization", `Bearer ${id}`);

  const query = new URLSearchParams({ kind, name: file.name });
  const response = await fetch(`${apiBase}/api/portal/assets?${query}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: file,
  });

  if (!response.ok) {
    throw failure(response, await response.json().catch(() => null));
  }

  return (await response.json()) as Uploaded;
}

type Result<T> = { data?: T; error?: unknown; response: Response };

export function unwrap<T>(result: Result<T>): T {
  if (!result.response.ok || result.data === undefined) {
    throw failure(result.response, result.error);
  }

  return result.data;
}

export function message(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return "You don't have access to that.";
    if (error.status === 401) return "Your session expired. Sign in again.";
    return error.message;
  }

  return error instanceof Error ? error.message : "Something went wrong.";
}

export type ShopOption = Schemas["ShopOption"];
export type OptionBody = Schemas["OptionBody"];

export async function setItemOptions(id: string, options: OptionBody[]): Promise<ShopOption[]> {
  return unwrap(
    await api.PUT("/api/portal/trade/items/{id}/options", {
      params: { path: { id } },
      body: { options },
    }),
  );
}
