const TAG = /^[0-9A-Za-z_]$/u;
const DIGIT = /^[0-9]$/u;

interface Read {
  text: string;
  end: number;
}

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

function lineCommentEnd(chars: string[], at: number): number {
  let end = at;

  while (end < chars.length && chars[end] !== "\n") end += 1;

  return end;
}

function blockCommentEnd(chars: string[], at: number): number {
  let depth = 1;
  let end = at + 2;

  while (end < chars.length && depth > 0) {
    if (chars[end] === "*" && chars[end + 1] === "/") {
      depth -= 1;
      end += 2;
    } else if (chars[end] === "/" && chars[end + 1] === "*") {
      depth += 1;
      end += 2;
    } else {
      end += 1;
    }
  }

  return end;
}

function readSingleQuoted(chars: string[], at: number, escaped: boolean): Read {
  let text = "'";
  let end = at + 1;

  while (end < chars.length) {
    const inside = chars[end] ?? "";

    if (escaped && inside === "\\" && end + 1 < chars.length) {
      text += inside + (chars[end + 1] ?? "");
      end += 2;
      continue;
    }

    if (inside === "'") {
      if (chars[end + 1] !== "'") return { text: `${text}'`, end: end + 1 };

      text += "''";
      end += 2;
      continue;
    }

    text += inside;
    end += 1;
  }

  return { text, end };
}

function readDoubleQuoted(chars: string[], at: number): Read {
  let text = '"';
  let end = at + 1;

  while (end < chars.length) {
    const inside = chars[end] ?? "";

    text += inside;
    end += 1;

    if (inside !== '"') continue;
    if (chars[end] !== '"') return { text, end };

    text += '"';
    end += 1;
  }

  return { text, end };
}

function readDollarQuoted(chars: string[], at: number, tag: string): Read {
  const width = Array.from(tag).length;
  let text = tag;
  let end = at + width;

  while (end < chars.length) {
    if (chars[end] === "$" && chars.slice(end, end + width).join("") === tag) {
      return { text: text + tag, end: end + width };
    }

    text += chars[end] ?? "";
    end += 1;
  }

  return { text, end };
}

function readQuoted(chars: string[], at: number, current: string): Read | null {
  const here = chars[at];

  if (here === "'") {
    const previous = current.slice(-1);
    return readSingleQuoted(chars, at, previous === "E" || previous === "e");
  }

  if (here === '"') return readDoubleQuoted(chars, at);

  if (here === "$") {
    const tag = tagAt(chars, at);
    return tag === null ? null : readDollarQuoted(chars, at, tag);
  }

  return null;
}

export function split(source: string): string[] {
  const chars = Array.from(source);
  const out: string[] = [];
  let current = "";
  let at = 0;

  const flush = () => {
    const statement = current.trim();
    if (statement !== "") out.push(statement);
    current = "";
  };

  while (at < chars.length) {
    const here = chars[at] ?? "";
    const next = chars[at + 1];

    if (here === "-" && next === "-") {
      at = lineCommentEnd(chars, at);
      continue;
    }

    if (here === "/" && next === "*") {
      at = blockCommentEnd(chars, at);
      continue;
    }

    const quoted = readQuoted(chars, at, current);
    if (quoted !== null) {
      current += quoted.text;
      at = quoted.end;
      continue;
    }

    if (here === ";") {
      flush();
      at += 1;
      continue;
    }

    current += here;
    at += 1;
  }

  flush();

  return out;
}
