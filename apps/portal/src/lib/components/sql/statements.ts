const TAG = /^[0-9A-Za-z_]$/u;
const DIGIT = /^[0-9]$/u;

function tagAt(chars: string[], at: number): string | null {
  let end = at + 1;

  while (end < chars.length && chars[end] !== "$") {
    const candidate = chars[end];

    if (candidate === undefined || !TAG.test(candidate)) return null;
    if (end === at + 1 && DIGIT.test(candidate)) return null;

    end += 1;
  }

  if (end >= chars.length) return null;

  return chars.slice(at, end + 1).join("");
}

export function split(source: string): string[] {
  const chars = [...source];
  const out: string[] = [];
  let current = "";
  let at = 0;
  let comments = 0;

  while (at < chars.length) {
    const here = chars[at];

    if (here === undefined) break;

    if (comments > 0) {
      if (here === "*" && chars[at + 1] === "/") {
        comments -= 1;
        at += 2;
        continue;
      }

      if (here === "/" && chars[at + 1] === "*") {
        comments += 1;
        at += 2;
        continue;
      }

      at += 1;
      continue;
    }

    if (here === "-" && chars[at + 1] === "-") {
      while (at < chars.length && chars[at] !== "\n") at += 1;
      continue;
    }

    if (here === "/" && chars[at + 1] === "*") {
      comments = 1;
      at += 2;
      continue;
    }

    if (here === "'") {
      const previous = current.slice(-1);
      const escaped = previous === "E" || previous === "e";

      current += here;
      at += 1;

      while (at < chars.length) {
        const inside = chars[at];

        if (inside === undefined) break;

        if (escaped && inside === "\\" && at + 1 < chars.length) {
          current += inside + (chars[at + 1] ?? "");
          at += 2;
          continue;
        }

        if (inside === "'") {
          if (chars[at + 1] === "'") {
            current += "''";
            at += 2;
            continue;
          }

          current += "'";
          at += 1;
          break;
        }

        current += inside;
        at += 1;
      }

      continue;
    }

    if (here === '"') {
      current += here;
      at += 1;

      while (at < chars.length) {
        const inside = chars[at];

        if (inside === undefined) break;

        current += inside;
        at += 1;

        if (inside === '"') {
          if (chars[at] === '"') {
            current += '"';
            at += 1;
            continue;
          }

          break;
        }
      }

      continue;
    }

    if (here === "$") {
      const tag = tagAt(chars, at);

      if (tag !== null) {
        const width = [...tag].length;

        current += tag;
        at += width;

        while (at < chars.length) {
          if (chars[at] === "$" && chars.slice(at, at + width).join("") === tag) {
            current += tag;
            at += width;
            break;
          }

          current += chars[at] ?? "";
          at += 1;
        }

        continue;
      }
    }

    if (here === ";") {
      if (current.trim() !== "") out.push(current.trim());

      current = "";
      at += 1;
      continue;
    }

    current += here;
    at += 1;
  }

  if (current.trim() !== "") out.push(current.trim());

  return out;
}
