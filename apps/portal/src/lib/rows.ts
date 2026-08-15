import { api, unwrap, type Page, type Written } from "$lib/api/client";
import type { Cell } from "$lib/values";

export type Row = Record<string, unknown>;

export type Query = {
  limit?: number;
  offset?: number;
  order?: string;
  desc?: boolean;
  search?: string;
};

export async function listRows(table: string, query: Query): Promise<Page> {
  return unwrap(
    await api.GET("/api/portal/tables/{table}/rows", {
      params: { path: { table }, query },
    }),
  );
}

export async function insertRow(table: string, row: Record<string, Cell>): Promise<Written> {
  return unwrap(
    await api.POST("/api/portal/tables/{table}/rows", {
      params: { path: { table } },
      body: { row },
    }),
  );
}

export async function updateRow(
  table: string,
  key: Record<string, Cell>,
  set: Record<string, Cell>,
): Promise<Written> {
  return unwrap(
    await api.PATCH("/api/portal/tables/{table}/rows", {
      params: { path: { table } },
      body: { key, set },
    }),
  );
}

export async function deleteRow(table: string, key: Record<string, Cell>): Promise<Written> {
  return unwrap(
    await api.DELETE("/api/portal/tables/{table}/rows", {
      params: { path: { table } },
      body: { key },
    }),
  );
}
