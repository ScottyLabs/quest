import type { jsPDF as JsPdf } from "jspdf";
import { pageSize } from "./posters";
import type { PageSize } from "./posters";

export interface Poster {
  name: string;
  svg: string;
}

export interface Progress {
  done: number;
  total: number;
}

export const FALLBACK_SIZE: PageSize = { width: 18 * 72, height: 24 * 72 };

function orientationOf(size: PageSize): "portrait" | "landscape" {
  return size.width > size.height ? "landscape" : "portrait";
}

type Svg2Pdf = (
  element: Element,
  doc: JsPdf,
  options: { x: number; y: number; width: number; height: number },
) => Promise<unknown>;

interface PdfKit {
  create: (size: PageSize) => JsPdf;
  render: Svg2Pdf;
}

async function loadKit(): Promise<PdfKit> {
  const [pdfModule, svgModule] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);

  const svg = svgModule as { svg2pdf?: Svg2Pdf; default?: { svg2pdf?: Svg2Pdf } };
  const render = svg.svg2pdf ?? svg.default?.svg2pdf;
  if (render === undefined) throw new Error("svg2pdf.js did not expose svg2pdf()");

  return {
    create: (size) =>
      new pdfModule.jsPDF({
        unit: "pt",
        format: [size.width, size.height],
        orientation: orientationOf(size),
        compress: true,
      }),
    render,
  };
}

function yieldToPaint(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, 0);
  return promise;
}

function mount(svg: string): { element: SVGSVGElement; dispose: () => void } {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-99999px;top:0;width:0;height:0;overflow:hidden;pointer-events:none";
  host.innerHTML = svg;

  const element = host.querySelector("svg");
  if (element === null) throw new Error("template has no <svg> root element");

  document.body.append(host);
  return { element, dispose: () => host.remove() };
}

export async function buildPdf(
  posters: readonly Poster[],
  onProgress?: (progress: Progress) => void,
): Promise<Blob> {
  const [first] = posters;
  if (first === undefined) throw new Error("no posters selected");

  const kit = await loadKit();
  const doc = kit.create(pageSize(first.svg) ?? FALLBACK_SIZE);

  for (let index = 0; index < posters.length; index += 1) {
    const poster = posters[index];
    if (poster === undefined) continue;

    const size = pageSize(poster.svg) ?? FALLBACK_SIZE;
    if (index > 0) doc.addPage([size.width, size.height], orientationOf(size));

    const { element, dispose } = mount(poster.svg);
    try {
      await kit.render(element, doc, { x: 0, y: 0, width: size.width, height: size.height });
    } finally {
      dispose();
    }

    onProgress?.({ done: index + 1, total: posters.length });
    await yieldToPaint();
  }

  return doc.output("blob");
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function printPosters(posters: readonly Poster[]): void {
  const [first] = posters;
  if (first === undefined) return;

  const size = pageSize(first.svg) ?? FALLBACK_SIZE;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;inset:0;width:0;height:0;border:0;opacity:0";
  document.body.append(frame);

  const doc = frame.contentDocument;
  if (doc === null) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${size.width}pt ${size.height}pt; margin: 0; }
    html, body { margin: 0; padding: 0; }
    .sheet { break-after: page; page-break-after: always; overflow: hidden; }
    .sheet:last-child { break-after: auto; page-break-after: auto; }
    .sheet svg { display: block; width: 100%; height: 100%; }
  </style></head><body>${posters
    .map((poster) => `<div class="sheet">${poster.svg}</div>`)
    .join("")}</body></html>`);
  doc.close();

  const run = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60_000);
  };

  if (doc.readyState === "complete") run();
  else frame.addEventListener("load", run, { once: true });
}
