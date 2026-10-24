import "server-only";
import { createHmac } from "node:crypto";
import { and, count, eq, gte, inArray, or, sql, sum } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { headers } from "next/headers";
import { matchStrength, nameKeys, phoneticKey, type MatchStrength } from "@/lib/names/phonetic";
import { db } from "@/server/db";
import { searchEvent, unclaimedRecord, unclaimedSource } from "@/server/db/schema";
import { env } from "@/server/env";
import { getCurrentUser } from "@/server/session";

// Search over public unclaimed-money statements. Privacy rules:
// - Anyone can see totals for a PIN and how many records share a first name.
// - Seeing records for a full name needs a signed-in account.
// - Folio numbers and full addresses appear only after the searcher confirms
//   the father's or husband's name on the record.
// - Every search is logged and rate limited.

type Kind = (typeof searchEvent.kind.enumValues)[number];

const LIMITS: Record<Kind, { window: "hour" | "day"; max: number; perUser: boolean }> = {
  summary: { window: "hour", max: 60, perUser: false },
  suggest: { window: "hour", max: 400, perUser: false },
  match: { window: "day", max: 40, perUser: true },
  confirm: { window: "day", max: 30, perUser: true },
};

export class RateLimitError extends Error {}

async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(ip).digest("hex").slice(0, 32);
}

async function guard(kind: Kind, userId: string | null): Promise<string> {
  const ipHash = await clientIpHash();
  const rule = LIMITS[kind];
  const since = new Date(Date.now() - (rule.window === "hour" ? 3600_000 : 86_400_000));
  const who =
    rule.perUser && userId ? eq(searchEvent.userId, userId) : eq(searchEvent.ipHash, ipHash);
  const [row] = await db
    .select({ n: count() })
    .from(searchEvent)
    .where(and(who, eq(searchEvent.kind, kind), gte(searchEvent.createdAt, since)));
  if ((row?.n ?? 0) >= rule.max) {
    throw new RateLimitError(
      rule.window === "hour"
        ? "Too many searches from this connection. Try again in an hour."
        : "You have reached today's search limit. Try again tomorrow.",
    );
  }
  return ipHash;
}

async function log(
  kind: Kind,
  ipHash: string,
  userId: string | null,
  pinCode: string,
  query: string | null,
  resultCount: number,
) {
  await db.insert(searchEvent).values({ kind, ipHash, userId, pinCode, query, resultCount });
}

// ---------------------------------------------------------------------------

export type PinSummary = {
  pinCode: string;
  records: number;
  amountPaise: number;
  companies: number;
  place: string | null;
  /** How much the whole index covers, so an empty result can say so honestly. */
  coverage: { companies: number; records: number };
};

export async function pinSummary(pinCode: string): Promise<PinSummary> {
  const ipHash = await guard("summary", null);
  const [row] = await db
    .select({
      records: count(),
      amountPaise: sum(unclaimedRecord.amountPaise).mapWith(Number),
      companies: sql<number>`count(distinct ${unclaimedSource.company})`.mapWith(Number),
    })
    .from(unclaimedRecord)
    .innerJoin(unclaimedSource, eq(unclaimedSource.id, unclaimedRecord.sourceId))
    .where(eq(unclaimedRecord.pinCode, pinCode));
  const summary = {
    pinCode,
    records: row?.records ?? 0,
    amountPaise: row?.amountPaise ?? 0,
    companies: row?.companies ?? 0,
    place: await placeForPin(pinCode),
    coverage: await coverage(),
  };
  await log("summary", ipHash, null, pinCode, null, summary.records);
  return summary;
}

async function coverage(): Promise<PinSummary["coverage"]> {
  const [row] = await db
    .select({
      companies: sql<number>`count(distinct ${unclaimedSource.company})`.mapWith(Number),
      records: sql<number>`coalesce(sum(${unclaimedSource.rowCount}), 0)`.mapWith(Number),
    })
    .from(unclaimedSource);
  return { companies: row?.companies ?? 0, records: row?.records ?? 0 };
}

/** Post office and district for a PIN, from India Post's public directory. */
async function placeForPin(pinCode: string): Promise<string | null> {
  "use cache";
  cacheLife("max");
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pinCode}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      Status: string;
      PostOffice?: { Name: string; District: string; State: string }[] | null;
    }[];
    const office = data[0]?.Status === "Success" ? data[0].PostOffice?.[0] : undefined;
    return office ? `${office.District}, ${office.State}` : null;
  } catch {
    return null;
  }
}

export type FirstNameSuggestion = { name: string; records: number };

/** First names in a PIN that start like the typed text, with how many records each has. */
export async function suggestFirstNames(
  pinCode: string,
  typed: string,
): Promise<FirstNameSuggestion[]> {
  const ipHash = await guard("suggest", null);
  const raw = typed.toLowerCase().replace(/[^a-z]/g, "");
  const key = phoneticKey(raw);
  const rows = await db
    .select({ firstKey: unclaimedRecord.firstKey, investorName: unclaimedRecord.investorName })
    .from(unclaimedRecord)
    .where(
      and(
        eq(unclaimedRecord.pinCode, pinCode),
        sql`${unclaimedRecord.firstKey} <> ''`,
        or(
          sql`${unclaimedRecord.firstKey} like ${`${key}%`}`,
          sql`lower(split_part(${unclaimedRecord.investorName}, ' ', 1)) like ${`${raw}%`}`,
        ),
      ),
    )
    .limit(2000);

  const groups = new Map<string, { spellings: Map<string, number>; records: number }>();
  for (const r of rows) {
    const first = r.investorName.trim().split(/\s+/)[0] ?? "";
    const g = groups.get(r.firstKey) ?? { spellings: new Map(), records: 0 };
    g.records++;
    const spelling = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
    g.spellings.set(spelling, (g.spellings.get(spelling) ?? 0) + 1);
    groups.set(r.firstKey, g);
  }
  const suggestions = [...groups.values()]
    .map((g) => ({
      name: [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0]![0],
      records: g.records,
    }))
    .sort((a, b) => b.records - a.records || a.name.localeCompare(b.name))
    .slice(0, 8);
  await log("suggest", ipHash, null, pinCode, raw, suggestions.length);
  return suggestions;
}

// ---------------------------------------------------------------------------

export type RecordMatch = {
  id: string;
  strength: Exclude<MatchStrength, "none">;
  nameOnRecord: string;
  fatherHint: string | null;
  company: string;
  kind: string;
  financialYear: string | null;
  amountPaise: number | null;
  shares: number | null;
  area: string | null;
};

/** Shows only the first letter of each word except the last: "Suresh Kumar Mehta" -> "S. K. Mehta". */
export function maskFatherName(name: string | null): string | null {
  if (!name) return null;
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return `${words[0]!.charAt(0)}.`;
  return [...words.slice(0, -1).map((w) => `${w.charAt(0).toUpperCase()}.`), words.at(-1)].join(
    " ",
  );
}

export async function matchName(
  pinCode: string,
  fullName: string,
): Promise<RecordMatch[] | "signin"> {
  const user = await getCurrentUser();
  if (!user) return "signin";
  const ipHash = await guard("match", user.id);

  const keys = nameKeys(fullName);
  const clauses = [
    keys.last && eq(unclaimedRecord.lastKey, keys.last),
    keys.first && eq(unclaimedRecord.firstKey, keys.first),
  ].filter(Boolean);
  if (clauses.length === 0) return [];

  const rows = await db
    .select({
      id: unclaimedRecord.id,
      investorName: unclaimedRecord.investorName,
      fatherName: unclaimedRecord.fatherName,
      company: unclaimedSource.company,
      kind: unclaimedSource.kind,
      financialYear: unclaimedSource.financialYear,
      amountPaise: unclaimedRecord.amountPaise,
      shares: unclaimedRecord.shares,
      district: unclaimedRecord.district,
      state: unclaimedRecord.state,
    })
    .from(unclaimedRecord)
    .innerJoin(unclaimedSource, eq(unclaimedSource.id, unclaimedRecord.sourceId))
    .where(and(eq(unclaimedRecord.pinCode, pinCode), or(...(clauses as ReturnType<typeof eq>[]))))
    .limit(500);

  const order = { exact: 0, strong: 1, possible: 2 } as const;
  const matches = rows
    .map((r) => ({ r, strength: matchStrength(fullName, r.investorName) }))
    .filter(
      (m): m is { r: (typeof rows)[number]; strength: Exclude<MatchStrength, "none"> } =>
        m.strength !== "none",
    )
    .sort(
      (a, b) =>
        order[a.strength] - order[b.strength] || (b.r.amountPaise ?? 0) - (a.r.amountPaise ?? 0),
    )
    .slice(0, 25)
    .map(({ r, strength }) => ({
      id: r.id,
      strength,
      nameOnRecord: r.investorName,
      fatherHint: maskFatherName(r.fatherName),
      company: r.company,
      kind: r.kind,
      financialYear: r.financialYear,
      amountPaise: r.amountPaise,
      shares: r.shares,
      area: [r.district, r.state].filter(Boolean).join(", ") || null,
    }));

  await log("match", ipHash, user.id, pinCode, fullName.slice(0, 120), matches.length);
  return matches;
}

export type ConfirmedRecord = RecordMatch & {
  fatherName: string | null;
  address: string | null;
  folio: string | null;
  pinCode: string;
};

/**
 * Reveals folio and address once the searcher names the father or husband on
 * the record. Records without a father's name on file can be confirmed by the
 * full name matching exactly or strongly.
 */
export async function confirmRecord(
  recordId: string,
  searchedName: string,
  fatherName: string,
): Promise<ConfirmedRecord | "signin" | "mismatch" | null> {
  const user = await getCurrentUser();
  if (!user) return "signin";
  const ipHash = await guard("confirm", user.id);

  const [r] = await db
    .select({
      record: unclaimedRecord,
      company: unclaimedSource.company,
      kind: unclaimedSource.kind,
      financialYear: unclaimedSource.financialYear,
    })
    .from(unclaimedRecord)
    .innerJoin(unclaimedSource, eq(unclaimedSource.id, unclaimedRecord.sourceId))
    .where(inArray(unclaimedRecord.id, [recordId]))
    .limit(1);
  if (!r) return null;

  const strength = matchStrength(searchedName, r.record.investorName);
  const fatherOk = r.record.fatherName
    ? (() => {
        const typed = nameKeys(fatherName);
        const onRecord = nameKeys(r.record.fatherName);
        return Boolean(typed.first) && typed.first === onRecord.first;
      })()
    : strength === "exact" || strength === "strong";

  await log(
    "confirm",
    ipHash,
    user.id,
    r.record.pinCode,
    `${searchedName.slice(0, 80)} / ${fatherName.slice(0, 80)}`,
    fatherOk ? 1 : 0,
  );
  if (strength === "none" || !fatherOk) return "mismatch";

  return {
    id: r.record.id,
    strength,
    nameOnRecord: r.record.investorName,
    fatherHint: maskFatherName(r.record.fatherName),
    company: r.company,
    kind: r.kind,
    financialYear: r.financialYear,
    amountPaise: r.record.amountPaise,
    shares: r.record.shares,
    area: [r.record.district, r.record.state].filter(Boolean).join(", ") || null,
    fatherName: r.record.fatherName,
    address: r.record.address,
    folio: r.record.folio,
    pinCode: r.record.pinCode,
  };
}
