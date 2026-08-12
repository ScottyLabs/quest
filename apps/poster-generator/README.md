# Poster Generator

Fills one SVG template per challenge category with names and card codes, then emits every poster
as a single print-ready PDF (one page per poster, each page sized to its template).

```sh
deno task posters dev     # http://localhost:5174
deno task posters build
deno task posters check
```

## Templates

One SVG per category in `src/lib/templates/`, named after the **slugified** category — lowercase,
apostrophes dropped, other non-alphanumeric runs collapsed to `-`:

| Category | File |
| ------------------------ | ------------------------------ |
| The Essentials | `the-essentials.svg` |
| Cool Corners of Carnegie | `cool-corners-of-carnegie.svg` |
| Campus of Bridges | `campus-of-bridges.svg` |
| Let's Eat! | `lets-eat.svg` |
| Minor-Major General | `minor-major-general.svg` |
| Residence and Relaxation | `residence-and-relaxation.svg` |

A category with no matching file is listed as missing in the UI and never printed.

## Placeholders

Write `{{NAME}}` anywhere in the SVG — text nodes or attribute values. Names are case-insensitive,
values are XML-escaped, and unknown placeholders are left untouched so typos stay visible.

| Placeholder | Source |
| ----------------- | ----------------------------------------- |
| `{{NAME}}` | `Challenge Name` |
| `{{CODE}}` | `Code` — four chars, `0-9` and `A-Z` |
| `{{CATEGORY}}` | `Category` |
| `{{TAGLINE}}` | `Tagline`, when present |
| `{{LOCATION}}` | `Challenge Marker Location`, when present |
| `{{DESCRIPTION}}` | `Description`, when present |

The root `<svg width height>` sets the PDF page size — units may be `in`, `mm`, `cm`, `pt` or `px`.
With no width/height the `viewBox` is read as pixels; with neither, pages fall back to 18x24in.

## CSV

Columns are detected by header name and can be reassigned in the UI. Only category and name are
required. Codes come from the `Code` column; blanks can be typed in or auto-assigned. Manual edits
are cached in `localStorage` keyed by `category|name` and cleared when a new sheet is uploaded, so
a revised export always wins over stale typing.

Note that these four-character codes are the human-facing poster codes, unrelated to
`challenge_card.card_id` in the backend, which is the 14-hex-digit NTAG 424 tag UID.

## Output

**Download PDF** vectorises the SVGs via `svg2pdf.js`. Text stays selectable, but only the standard
PDF fonts are embedded — convert text to paths in your templates if you use a custom typeface.

**Print** hands the same posters to the browser, which embeds real fonts. It uses the first poster's
dimensions for `@page`, so mixed template sizes should go through Download instead.
