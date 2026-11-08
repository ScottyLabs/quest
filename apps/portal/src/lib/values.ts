import type { PortalColumn } from "$lib/api/client";

export type Cell = string | number | boolean | null | unknown[] | Record<string, unknown>;

export type Input = "text" | "area" | "number" | "boolean" | "timestamp" | "date" | "json";

export function inputFor(column: PortalColumn): Input {
  const kind = column.kind.toLowerCase();

  if (kind === "boolean") return "boolean";
  if (kind.startsWith("timestamp")) return "timestamp";
  if (kind === "date") return "date";
  if (kind === "json" || kind === "jsonb") return "json";
  if (/^(small|big)?int|^numeric|^real|^double|^decimal/u.test(kind)) return "number";
  if (kind === "text" || kind.startsWith("geography") || kind.startsWith("geometry")) return "area";

  return "text";
}

export function display(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  return JSON.stringify(value);
}

export function toInput(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  return JSON.stringify(value, null, 2);
}

export function fromInput(text: string, column: PortalColumn): Cell {
  const trimmed = text.trim();

  if (trimmed === "") return column.nullable ? null : "";

  switch (inputFor(column)) {
    case "boolean":
      return trimmed === "true" || trimmed === "t" || trimmed === "1";
    case "number": {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) throw new Error(`${column.name} must be a number`);
      return parsed;
    }
    case "json": {
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        throw new Error(`${column.name} must be valid JSON`);
      }
      if (!isCell(parsed)) throw new Error(`${column.name} must be valid JSON`);
      return parsed;
    }
    case "text":
    case "area":
    case "timestamp":
    case "date":
      break;
  }

  return text;
}

function isCell(value: unknown): value is Cell {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "object"
  );
}

export function keyOf(row: Record<string, unknown>, key: string[]): Record<string, Cell> {
  const out: Record<string, Cell> = {};

  for (const column of key) {
    const value = row[column] ?? null;
    out[column] = isCell(value) ? value : null;
  }

  return out;
}

export function rowKey(row: Record<string, unknown>, key: string[]): string {
  return key.map((column) => display(row[column])).join("\u001F");
}
