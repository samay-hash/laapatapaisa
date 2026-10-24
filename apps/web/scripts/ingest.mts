// Imports one published unclaimed-money statement into the database.
//   pnpm data:ingest --url <file url> --company "ITC Ltd" --kind unclaimed_dividend --fy 2017-18
//   pnpm data:ingest --file ./statement.xlsx --company "ITC Ltd"
// Files are hashed, so importing the same file twice does nothing.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as XLSX from "xlsx";
import { nameKeys } from "../src/lib/names/phonetic";
import { parseTable, type ParsedRow } from "../src/lib/ingest/parse-table";
import { pdfToTable } from "../src/lib/ingest/pdf-table";
import { sslFor } from "../src/server/db/ssl";
import { recordKindEnum, unclaimedRecord, unclaimedSource } from "../src/server/db/schema/records";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Rely on variables already set.
}

const { values: args } = parseArgs({
  options: {
    url: { type: "string" },
    file: { type: "string" },
    company: { type: "string" },
    kind: { type: "string", default: "unclaimed_dividend" },
    fy: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    pin: { type: "string", default: "852215" },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!args.company || (!args.url && !args.file)) {
  fail(
    'Usage: pnpm data:ingest --url <url> | --file <path>  --company "Name" [--kind unclaimed_dividend|shares_transferred_to_iepf|other] [--fy 2017-18] [--dry-run]',
  );
}
const kind = args.kind as (typeof recordKindEnum.enumValues)[number];
if (!recordKindEnum.enumValues.includes(kind)) fail(`Unknown --kind ${args.kind}`);

async function load(): Promise<{ bytes: Uint8Array; source: string }> {
  if (args.file) return { bytes: new Uint8Array(await readFile(args.file)), source: args.file };
  const res = await fetch(args.url!, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; LaapataPaisa/1.0; public IEPF statements)" },
    redirect: "follow",
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) fail(`Download failed: HTTP ${res.status} for ${args.url}`);
  return { bytes: new Uint8Array(await res.arrayBuffer()), source: args.url! };
}

function isPdf(bytes: Uint8Array) {
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
}

async function tables(bytes: Uint8Array): Promise<unknown[][][]> {
  if (isPdf(bytes)) return [await pdfToTable(bytes)];
  const wb = XLSX.read(bytes, { type: "array", cellDates: false, dense: true });
  return wb.SheetNames.map((name) =>
    XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name]!, { header: 1, raw: false, defval: "" }),
  );
}

const { bytes, source } = await load();
const fileHash = createHash("sha256").update(bytes).digest("hex");

const rows: ParsedRow[] = [];
let skipped = 0;
for (const table of await tables(bytes)) {
  const parsed = parseTable(table);
  if (!parsed) continue;
  rows.push(...parsed.rows);
  skipped += parsed.skipped;
}

const inPin = rows.filter((r) => r.pinCode === args.pin);
console.log(
  `${args.company}: ${rows.length} records parsed, ${skipped} lines skipped, ${inPin.length} in PIN ${args.pin}`,
);
if (rows.length === 0) fail("No records found. The file layout may need a new parser rule.");
if (args["dry-run"]) {
  console.log("Sample:", rows.slice(0, 3));
  process.exit(0);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslFor(process.env.DATABASE_URL!),
});
const db = drizzle(pool);

const existing = await db
  .select({ id: unclaimedSource.id })
  .from(unclaimedSource)
  .where(eq(unclaimedSource.fileHash, fileHash));
if (existing.length) {
  console.log("Already imported (same file). Nothing to do.");
  await pool.end();
  process.exit(0);
}

await db.transaction(async (tx) => {
  const [src] = await tx
    .insert(unclaimedSource)
    .values({
      company: args.company!,
      url: source,
      kind,
      financialYear: args.fy ?? null,
      fileHash,
      rowCount: rows.length,
    })
    .returning({ id: unclaimedSource.id });

  for (let i = 0; i < rows.length; i += 1000) {
    await tx.insert(unclaimedRecord).values(
      rows.slice(i, i + 1000).map((r) => {
        const keys = nameKeys(r.investorName);
        return {
          ...r,
          sourceId: src!.id,
          firstKey: keys.first,
          lastKey: keys.last,
          initials: keys.initials,
          nameKeys: keys.all,
          fatherKeys: r.fatherName ? nameKeys(r.fatherName).all : [],
        };
      }),
    );
  }
});

const [{ total }] = (await db.execute(sql`select count(*)::int as total from unclaimed_record`))
  .rows as [{ total: number }];
console.log(`Imported. Database now holds ${total} records.`);
await pool.end();
