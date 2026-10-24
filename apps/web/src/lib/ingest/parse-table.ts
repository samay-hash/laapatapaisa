// Turns a statement table (rows of cell text, from Excel or a PDF) into clean
// records. Every company lays its IEPF statement out a little differently, so
// columns are found by their header text rather than by position.

export type ParsedRow = {
  investorName: string;
  fatherName: string | null;
  address: string | null;
  district: string | null;
  state: string | null;
  pinCode: string;
  folio: string | null;
  amountPaise: number | null;
  shares: number | null;
  investmentType: string | null;
  transferDate: string | null; // YYYY-MM-DD
};

export type ParseResult = {
  rows: ParsedRow[];
  skipped: number;
  headerRow: number;
  columns: Partial<Record<Field, number[]>>;
};

export type Field =
  | "first"
  | "middle"
  | "last"
  | "fullName"
  | "fatherFirst"
  | "fatherMiddle"
  | "fatherLast"
  | "fatherFull"
  | "address"
  | "district"
  | "state"
  | "pin"
  | "folio"
  | "amount"
  | "shares"
  | "investmentType"
  | "date";

const norm = (s: unknown) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

const lower = (s: string) => s.toLowerCase();

/** Decides which field a header cell describes. Order matters: specific before general. */
export function classify(header: string): Field | null {
  const h = lower(header);
  if (!h) return null;
  const isFather = /father|husband|guardian|f\/h|s\/o|w\/o|d\/o/.test(h);
  if (isFather) {
    if (/first/.test(h)) return "fatherFirst";
    if (/middle/.test(h)) return "fatherMiddle";
    if (/last/.test(h)) return "fatherLast";
    return "fatherFull";
  }
  if (/pin\s*code|^pin$|pincode|postal|zip/.test(h)) return "pin";
  if (/folio|dp\s*id|client\s*id|account\s*(no|number)|beneficiary/.test(h)) return "folio";
  if (/first\s*name/.test(h)) return "first";
  if (/middle\s*name/.test(h)) return "middle";
  if (/last\s*name|surname/.test(h)) return "last";
  if (/(investor|shareholder|share holder|member|holder)'?s?\s*name|^name$|name of/.test(h)) {
    return "fullName";
  }
  if (/address/.test(h)) return "address";
  if (/district|city/.test(h)) return "district";
  if (/state/.test(h)) return "state";
  if (/no\.?\s*of\s*shares|number of shares|shares|quantity/.test(h) && !/amount/.test(h)) {
    return "shares";
  }
  if (/amount|dividend|value|\(rs|₹|inr/.test(h)) return "amount";
  if (/investment\s*type|nature|type of/.test(h)) return "investmentType";
  if (/date/.test(h)) return "date";
  return null;
}

function mapColumns(header: string[]): Partial<Record<Field, number[]>> {
  const cols: Partial<Record<Field, number[]>> = {};
  header.forEach((cell, i) => {
    const field = classify(cell);
    if (field) (cols[field] ??= []).push(i);
  });
  return cols;
}

function score(cols: Partial<Record<Field, number[]>>): number {
  let s = Object.keys(cols).length;
  if (cols.pin) s += 3;
  if (cols.first || cols.fullName) s += 3;
  return s;
}

/** Finds the header, allowing it to be split over two rows (group label above sub-labels). */
function findHeader(table: string[][]): { row: number; header: string[] } | null {
  let best: { row: number; header: string[]; score: number } | null = null;
  const limit = Math.min(table.length, 80);
  for (let r = 0; r < limit; r++) {
    const one = (table[r] ?? []).map(norm);
    const next = (table[r + 1] ?? []).map(norm);
    const width = Math.max(one.length, next.length);
    const two = Array.from({ length: width }, (_, i) => norm(`${carry(one, i)} ${next[i] ?? ""}`));
    for (const [header, row] of [
      [one, r],
      [two, r + 1],
    ] as const) {
      const cols = mapColumns(header);
      if (!cols.pin || !(cols.first || cols.fullName)) continue;
      const sc = score(cols);
      if (!best || sc > best.score) best = { row, header, score: sc };
    }
  }
  return best ? { row: best.row, header: best.header } : null;
}

// A group label like "Name of Investor" often spans several merged cells.
function carry(row: string[], i: number): string {
  for (let j = i; j >= 0; j--) if (row[j]) return j === i ? row[j]! : "";
  return "";
}

const PIN = /\b([1-9]\d{5})\b/g;

function pinFrom(...cells: (string | null)[]): string | null {
  for (const cell of cells) {
    if (!cell) continue;
    const digits = cell.replace(/[\s-]/g, "");
    if (/^[1-9]\d{5}$/.test(digits)) return digits;
    const all = [...cell.matchAll(PIN)];
    if (all.length) return all.at(-1)![1]!;
  }
  return null;
}

function amountPaise(cell: string | null): number | null {
  if (!cell) return null;
  const n = Number(cell.replace(/[₹,\s]|rs\.?/gi, ""));
  // Above ₹100 crore in one row is a parsing error, not a dividend.
  return Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n * 100) : null;
}

function wholeNumber(cell: string | null): number | null {
  if (!cell) return null;
  const n = Number(cell.replace(/[,\s]/g, ""));
  return Number.isInteger(n) && n >= 0 && n < 2_000_000_000 ? n : null;
}

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function isoDate(cell: string | null): string | null {
  if (!cell) return null;
  const s = cell.trim();
  let m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[A-Za-z]*[-/ ](\d{4})$/);
  if (m) {
    const mon = MONTHS[m[2]!.toLowerCase()];
    return mon ? `${m[3]}-${mon}-${m[1]!.padStart(2, "0")}` : null;
  }
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

const join = (...parts: (string | null | undefined)[]) =>
  norm(parts.filter(Boolean).join(" ")) || null;

const EMPTY_NAME = /^(na|n\/a|nil|-|\.|0)$/i;

export function parseTable(table: unknown[][]): ParseResult | null {
  const cells = table.map((row) => (Array.isArray(row) ? row.map(norm) : []));
  const found = findHeader(cells);
  if (!found) return null;

  const cols = mapColumns(found.header);
  // Numbers and dates are never joined across columns: take the first filled one.
  const first = (row: string[], field: Field) => {
    for (const i of cols[field] ?? []) if (row[i]) return row[i]!;
    return null;
  };
  const get = (row: string[], field: Field) => {
    const idx = cols[field];
    if (!idx) return null;
    return join(...idx.map((i) => row[i]));
  };

  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const row of cells.slice(found.row + 1)) {
    if (row.every((c) => !c)) continue;
    const name =
      get(row, "fullName") ?? join(get(row, "first"), get(row, "middle"), get(row, "last"));
    const address = get(row, "address");
    const pin = pinFrom(first(row, "pin"), address);
    if (!name || EMPTY_NAME.test(name) || !pin || !/[a-z]/i.test(name)) {
      skipped++;
      continue;
    }
    const father =
      get(row, "fatherFull") ??
      join(get(row, "fatherFirst"), get(row, "fatherMiddle"), get(row, "fatherLast"));
    rows.push({
      investorName: name,
      fatherName: father && !EMPTY_NAME.test(father) ? father : null,
      address,
      district: get(row, "district"),
      state: get(row, "state"),
      pinCode: pin,
      folio: get(row, "folio"),
      amountPaise: amountPaise(first(row, "amount")),
      shares: wholeNumber(first(row, "shares")),
      investmentType: get(row, "investmentType"),
      transferDate: isoDate(first(row, "date")),
    });
  }
  return { rows, skipped, headerRow: found.row, columns: cols };
}
