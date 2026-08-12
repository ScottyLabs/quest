import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { detectColumns, parseCsv } from "./csv";
import type { Columns, Sheet } from "./csv";
import { cleanCode, codeOk, fill, nextCode, slugify, templateFor } from "./posters";

export interface Challenge {
  key: string;
  category: string;
  slug: string;
  name: string;
  code: string;
  hasTemplate: boolean;
  extras: Record<string, string>;
}

export interface CategorySummary {
  category: string;
  slug: string;
  count: number;
  hasTemplate: boolean;
}

const CODES_KEY = "posters.codes";
const CSV_KEY = "posters.csv";

const EXTRA_COLUMNS: Record<string, string> = {
  tagline: "TAGLINE",
  "challenge marker location": "LOCATION",
  location: "LOCATION",
  description: "DESCRIPTION",
};

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

class Posters {
  #sheet = $state<Sheet>({ headers: [], rows: [] });
  #override = $state<Partial<Columns>>({});
  #codes = new SvelteMap<string, string>();
  #excluded = new SvelteSet<string>();

  get headers(): string[] {
    return this.#sheet.headers;
  }

  get rowCount(): number {
    return this.#sheet.rows.length;
  }

  get columns(): Columns {
    const detected = detectColumns(this.#sheet.headers);
    return {
      category: this.#override.category ?? detected.category,
      name: this.#override.name ?? detected.name,
      code: this.#override.code ?? detected.code,
    };
  }

  get challenges(): Challenge[] {
    const { category: categoryColumn, name: nameColumn, code: codeColumn } = this.columns;
    if (categoryColumn === null || nameColumn === null) return [];

    const seen = new Map<string, number>();

    return this.#sheet.rows.flatMap((row) => {
      const category = row[categoryColumn] ?? "";
      const name = row[nameColumn] ?? "";
      if (category === "" && name === "") return [];

      const base = `${category}|${name}`;
      const repeat = seen.get(base) ?? 0;
      seen.set(base, repeat + 1);
      const key = repeat === 0 ? base : `${base}#${repeat}`;

      const fromCsv = codeColumn === null ? "" : (row[codeColumn] ?? "").toUpperCase();

      const extras: Record<string, string> = {};
      for (const [header, value] of Object.entries(row)) {
        const placeholder = EXTRA_COLUMNS[header.trim().toLowerCase()];
        if (placeholder !== undefined && value !== "") extras[placeholder] = value;
      }

      return [
        {
          key,
          category,
          slug: slugify(category),
          name,
          code: this.#codes.get(key) ?? fromCsv,
          hasTemplate: templateFor(category) !== null,
          extras,
        },
      ];
    });
  }

  get categories(): CategorySummary[] {
    const counts = new Map<string, number>();
    for (const challenge of this.challenges) {
      counts.set(challenge.category, (counts.get(challenge.category) ?? 0) + 1);
    }

    return [...counts].map(([category, count]) => ({
      category,
      slug: slugify(category),
      count,
      hasTemplate: templateFor(category) !== null,
    }));
  }

  get missingTemplates(): CategorySummary[] {
    return this.categories.filter((entry) => !entry.hasTemplate);
  }

  get printable(): Challenge[] {
    return this.challenges.filter(
      (challenge) =>
        challenge.hasTemplate && codeOk(challenge.code) && !this.#excluded.has(challenge.key),
    );
  }

  get blocked(): Challenge[] {
    return this.challenges.filter(
      (challenge) =>
        !this.#excluded.has(challenge.key) && (!challenge.hasTemplate || !codeOk(challenge.code)),
    );
  }

  excluded(key: string): boolean {
    return this.#excluded.has(key);
  }

  toggle(key: string): void {
    if (this.#excluded.has(key)) this.#excluded.delete(key);
    else this.#excluded.add(key);
  }

  restore(): void {
    const csv = stored(CSV_KEY);
    if (csv !== null) this.#sheet = parseCsv(csv);

    const codes = stored(CODES_KEY);
    if (codes === null) return;

    try {
      for (const [key, code] of Object.entries(JSON.parse(codes) as Record<string, string>)) {
        this.#codes.set(key, code);
      }
    } catch {}
  }

  ingest(text: string): void {
    this.#sheet = parseCsv(text);
    this.#override = {};
    this.#codes.clear();
    this.#persist();
    try {
      localStorage.setItem(CSV_KEY, text);
    } catch {}
  }

  setColumn(kind: keyof Columns, header: string): void {
    this.#override = { ...this.#override, [kind]: header === "" ? null : header };
  }

  setCode(key: string, code: string): void {
    const clean = cleanCode(code);
    if (clean === "") this.#codes.delete(key);
    else this.#codes.set(key, clean);
    this.#persist();
  }

  autoAssign(): void {
    for (const challenge of this.challenges) {
      if (codeOk(challenge.code)) continue;
      this.#codes.set(challenge.key, nextCode(this.#taken()));
    }
    this.#persist();
  }

  clearCodes(): void {
    this.#codes.clear();
    this.#persist();
  }

  svgFor(challenge: Challenge): string | null {
    const template = templateFor(challenge.category);
    if (template === null) return null;

    return fill(template, {
      NAME: challenge.name,
      CODE: challenge.code,
      CATEGORY: challenge.category,
      ...challenge.extras,
    });
  }

  #taken(): string[] {
    return this.challenges.map((challenge) => challenge.code).filter(codeOk);
  }

  #persist(): void {
    try {
      localStorage.setItem(CODES_KEY, JSON.stringify(Object.fromEntries(this.#codes)));
    } catch {}
  }
}

export const posters = new Posters();
