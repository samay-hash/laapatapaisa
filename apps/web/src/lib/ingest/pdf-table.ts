// Rebuilds the rows and columns of a statement table from a PDF's positioned
// text. Statement PDFs are usually exported from Excel, and long cells wrap
// onto several lines. Two strategies:
//   - Cell boxes: Excel exports clip every cell to its rectangle. When those
//     rectangles exist, a text item's row and column come from its cell box,
//     which is exact whatever the vertical alignment.
//   - Lines: otherwise each record is anchored on the line with its PIN (or
//     amount) and other lines join the nearest anchor.
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { classify } from "./parse-table";

type Box = { x0: number; y0: number; x1: number; y1: number };
type Item = { text: string; x: number; right: number; y: number; box: Box | null };
type Line = { y: number; items: Item[]; page: number };
type Column = { text: string; x: number; right: number };

const Y_TOLERANCE = 2.5;
const PIN_CELL = /^[1-9]\d{5}$/;
const AMOUNT_CELL = /^\d{1,3}(,?\d{2,3})*\.\d{2}$/;

/** Smallest clip rectangle around each point: the cell the text was drawn in. */
function cellBoxes(fnArray: number[], argsArray: unknown[][], pageW: number, pageH: number): Box[] {
  const boxes: Box[] = [];
  for (let i = 0; i < fnArray.length; i++) {
    if (fnArray[i] !== OPS.constructPath) continue;
    const mm = argsArray[i]?.[2] as ArrayLike<number> | undefined;
    if (!mm || mm.length < 4) continue;
    const box = { x0: mm[0]!, y0: mm[1]!, x1: mm[2]!, y1: mm[3]! };
    const w = box.x1 - box.x0;
    const h = box.y1 - box.y0;
    if (w > 1 && h > 1 && w < pageW * 0.97 && h < pageH * 0.3) boxes.push(box);
  }
  return boxes;
}

function boxAt(boxes: Box[], x: number, y: number): Box | null {
  let best: Box | null = null;
  for (const b of boxes) {
    if (x >= b.x0 - 0.5 && x <= b.x1 && y >= b.y0 - 0.5 && y <= b.y1 + 0.5) {
      if (!best || (b.x1 - b.x0) * (b.y1 - b.y0) < (best.x1 - best.x0) * (best.y1 - best.y0))
        best = b;
    }
  }
  return best;
}

async function readLines(data: Uint8Array): Promise<Line[]> {
  const task = getDocument({ data, useSystemFonts: true });
  const doc = await task.promise;
  const lines: Line[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const [content, ops] = await Promise.all([page.getTextContent(), page.getOperatorList()]);
    const [, , pageW, pageH] = page.view as [number, number, number, number];
    const boxes = cellBoxes(ops.fnArray, ops.argsArray as unknown[][], pageW, pageH);
    const items: Item[] = [];
    for (const raw of content.items) {
      if (!("str" in raw) || !raw.str.trim()) continue;
      const x = raw.transform[4] as number;
      const y = raw.transform[5] as number;
      items.push({
        text: raw.str.trim(),
        x,
        y,
        right: x + raw.width,
        box: boxAt(boxes, x + 0.5, y + 1),
      });
    }
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const pageLines: Line[] = [];
    for (const item of items) {
      const line = pageLines.find((l) => Math.abs(l.y - item.y) <= Y_TOLERANCE);
      if (line) line.items.push(item);
      else pageLines.push({ y: item.y, items: [item], page: p });
    }
    for (const l of pageLines) l.items.sort((a, b) => a.x - b.x);
    lines.push(...pageLines);
    page.cleanup();
  }
  await task.destroy();
  return lines;
}

const textOf = (line: Line) => line.items.map((i) => i.text).join(" ");
const isPin = (i: Item) => PIN_CELL.test(i.text.replace(/\s/g, ""));
const hasPinCell = (line: Line) => line.items.some(isPin);
const hasAmountCell = (line: Line) => line.items.some((i) => AMOUNT_CELL.test(i.text));
const headerWords = (line: Line) =>
  line.items.filter((i) => !/\d/.test(i.text) && classify(i.text) !== null).length;
const looksLikeHeader = (line: Line) =>
  line.items.length >= 3 && !/\d/.test(textOf(line)) && headerWords(line) >= 1;

/** Finds the header block: the line naming the PIN column and header lines stacked tightly with it. */
function findHeader(lines: Line[], isAnchor: (l: Line) => boolean) {
  const firstAnchor = lines.findIndex(isAnchor);
  if (firstAnchor < 0) return null;
  for (let i = firstAnchor - 1; i >= Math.max(0, firstAnchor - 10); i--) {
    const line = lines[i]!;
    if (line.page !== lines[firstAnchor]!.page) break;
    if (!/pin|postal/i.test(textOf(line)) || headerWords(line) < 3) continue;
    const near = (a: Line, b: Line) => Math.abs(a.y - b.y) <= 14;
    let start = i;
    while (
      start > 0 &&
      looksLikeHeader(lines[start - 1]!) &&
      near(lines[start - 1]!, lines[start]!)
    )
      start--;
    let end = i + 1;
    while (end < firstAnchor && looksLikeHeader(lines[end]!) && near(lines[end]!, lines[end - 1]!))
      end++;
    return { start, end };
  }
  return null;
}

/** A cell box, if the item has one. Row-wide clip boxes say nothing about the column. */
function cellBox(item: Item): Box | null {
  const b = item.box;
  if (!b) return null;
  return b.x1 - b.x0 <= Math.max(100, 3 * (item.right - item.x)) ? b : null;
}

/** Header items stacked on top of each other form one column; a cell box widens it. */
function headerColumns(headerLines: Line[]): Column[] {
  const cols: Column[] = [];
  for (const line of headerLines) {
    for (const item of line.items) {
      const x = cellBox(item)?.x0 ?? item.x;
      const right = cellBox(item)?.x1 ?? item.right;
      const same = cols.find((c) => x < c.right - 1 && right > c.x + 1);
      if (same) {
        same.text = `${same.text} ${item.text}`;
        same.x = Math.min(same.x, x);
        same.right = Math.max(same.right, right);
      } else cols.push({ text: item.text, x, right });
    }
  }
  return cols.sort((a, b) => a.x - b.x);
}

function columnFor(cols: Column[], item: Item): number {
  const x = cellBox(item)?.x0 ?? item.x;
  const right = cellBox(item)?.x1 ?? item.right;
  let best = -1;
  let bestOverlap = 0;
  cols.forEach((c, i) => {
    const overlap = Math.min(c.right, right) - Math.max(c.x, x);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = i;
    }
  });
  if (best >= 0) return best;
  const centre = (x + right) / 2;
  let nearest = 0;
  cols.forEach((c, i) => {
    const d = Math.abs((c.x + c.right) / 2 - centre);
    if (d < Math.abs((cols[nearest]!.x + cols[nearest]!.right) / 2 - centre)) nearest = i;
  });
  return nearest;
}

/** Groups body lines into records. Returns, per record, the items in reading order. */
function groupRecords(body: Line[], isAnchor: (l: Line) => boolean): Item[][] {
  const items = body.flatMap((l) => l.items.map((i) => ({ ...i, page: l.page })));
  const boxed = items.filter((i) => i.box).length;

  if (items.length > 0 && boxed / items.length > 0.7) {
    // Cell boxes: a record is everything whose box shares the PIN cell's row band.
    const records: Item[][] = [];
    for (const anchor of items.filter((i) => isPin(i) && i.box)) {
      const band = anchor.box!;
      const mid = (b: Box) => (b.y0 + b.y1) / 2;
      records.push(
        items
          .filter(
            (i) =>
              i.page === anchor.page && i.box && mid(i.box) >= band.y0 && mid(i.box) <= band.y1,
          )
          .sort((a, b) => b.y - a.y || a.x - b.x),
      );
    }
    return records;
  }

  const anchors = body.filter(isAnchor);
  const groups = new Map<Line, Line[]>(anchors.map((a) => [a, [a]]));
  for (const line of body) {
    if (groups.has(line)) continue;
    let best: Line | null = null;
    for (const a of anchors) {
      if (a.page !== line.page) continue;
      if (!best || Math.abs(a.y - line.y) < Math.abs(best.y - line.y)) best = a;
    }
    if (best && Math.abs(best.y - line.y) < 40) groups.get(best)!.push(line);
  }
  return anchors.map((a) =>
    groups
      .get(a)!
      .sort((x, y) => y.y - x.y)
      .flatMap((l) => l.items),
  );
}

export async function pdfToTable(data: Uint8Array): Promise<string[][]> {
  const lines = await readLines(data);
  const isAnchor = lines.some(hasPinCell) ? hasPinCell : hasAmountCell;
  const header = findHeader(lines, isAnchor);
  if (!header) return [];

  const cols = headerColumns(lines.slice(header.start, header.end));
  if (cols.length < 3) return [];

  // Pages repeat the header; drop those lines from the body.
  const body = lines
    .slice(header.end)
    .filter((l) => isAnchor(l) || !(looksLikeHeader(l) && headerWords(l) >= 3));

  const table: string[][] = [cols.map((c) => c.text)];
  for (const record of groupRecords(body, isAnchor)) {
    const row = cols.map(() => "");
    for (const item of record) {
      const col = columnFor(cols, item);
      row[col] = `${row[col]} ${item.text}`.trim();
    }
    table.push(row);
  }
  return table;
}
