export type Row = Record<string, string>;

export interface Sheet {
  headers: string[];
  rows: Row[];
}

export interface Columns {
  category: string | null;
  name: string | null;
  code: string | null;
}

export function parseCsv(text: string): Sheet {
  const rows: string[][] = [];
  let field = "";
  let record: string[] = [];
  let quoted = false;

  const source = text.replace(/^\uFEFF/u, "");

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      record.push(field);
      rows.push(record);
      record = [];
      field = "";
    } else field += char;
  }

  if (field !== "" || record.length > 0) {
    record.push(field);
    rows.push(record);
  }

  const [head, ...body] = rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
  if (head === undefined) return { headers: [], rows: [] };

  const headers = head.map((cell) => cell.trim());

  return {
    headers,
    rows: body.map((cells) =>
      Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? "").trim()])),
    ),
  };
}

function score(header: string, exact: string[], loose: string[], veto: string[]): number {
  const key = header.trim().toLowerCase();
  if (veto.some((word) => key.includes(word))) return 0;

  const hit = exact.indexOf(key);
  if (hit !== -1) return 100 - hit;

  return loose.some((word) => key.includes(word)) ? 50 : 0;
}

function best(headers: string[], exact: string[], loose: string[], veto: string[]): string | null {
  let winner: string | null = null;
  let top = 0;

  for (const header of headers) {
    const value = score(header, exact, loose, veto);
    if (value > top) {
      top = value;
      winner = header;
    }
  }

  return winner;
}

export function detectColumns(headers: string[]): Columns {
  return {
    category: best(headers, ["category"], ["category"], ["num", "number"]),
    name: best(headers, ["challenge name", "name", "challenge"], ["name"], ["category", "file"]),
    code: best(
      headers,
      ["code", "card id", "card_id", "cardid", "card"],
      ["code", "card"],
      ["barcode"],
    ),
  };
}
