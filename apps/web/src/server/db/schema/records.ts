// Public unclaimed-money statements (IEPF-2 and similar) that companies must
// publish, indexed by PIN code and phonetic name keys for search.
import {
  bigint,
  boolean,
  char,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const recordKindEnum = pgEnum("record_kind", [
  "unclaimed_dividend",
  "shares_transferred_to_iepf",
  "other",
]);

export const unclaimedSource = pgTable(
  "unclaimed_source",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    company: text("company").notNull(),
    url: text("url").notNull(),
    kind: recordKindEnum("kind").notNull(),
    financialYear: text("financial_year"),
    // SHA-256 of the downloaded file, so the same file is never imported twice.
    fileHash: text("file_hash").notNull().unique(),
    rowCount: integer("row_count").notNull().default(0),
    importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("unclaimed_source_company_idx").on(t.company)],
).enableRLS();

export const unclaimedRecord = pgTable(
  "unclaimed_record",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => unclaimedSource.id, { onDelete: "cascade" }),
    investorName: text("investor_name").notNull(),
    fatherName: text("father_name"),
    address: text("address"),
    district: text("district"),
    state: text("state"),
    pinCode: char("pin_code", { length: 6 }).notNull(),
    folio: text("folio"),
    // Paise, so amounts like ₹152.50 stay exact.
    amountPaise: bigint("amount_paise", { mode: "number" }),
    shares: integer("shares"),
    investmentType: text("investment_type"),
    transferDate: date("transfer_date"),
    firstKey: text("first_key").notNull(),
    lastKey: text("last_key").notNull(),
    initials: text("initials").notNull(),
    nameKeys: text("name_keys").array().notNull(),
    fatherKeys: text("father_keys").array().notNull().default([]),
  },
  (t) => [
    index("unclaimed_record_pin_first_idx").on(t.pinCode, t.firstKey),
    index("unclaimed_record_pin_last_idx").on(t.pinCode, t.lastKey),
    index("unclaimed_record_source_idx").on(t.sourceId),
  ],
).enableRLS();

export const searchKindEnum = pgEnum("search_kind", [
  "summary",
  "suggest",
  "match",
  "confirm",
  "scan",
]);

// Every search is logged so misuse (for example, someone sweeping a village)
// can be spotted and blocked. Kept for 90 days.
export const searchEvent = pgTable(
  "search_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: searchKindEnum("kind").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    // HMAC of the IP address, never the raw address.
    ipHash: text("ip_hash").notNull(),
    pinCode: char("pin_code", { length: 6 }),
    query: text("query"),
    resultCount: integer("result_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("search_event_ip_time_idx").on(t.ipHash, t.createdAt),
    index("search_event_user_time_idx").on(t.userId, t.createdAt),
  ],
).enableRLS();

export type UnclaimedRecord = typeof unclaimedRecord.$inferSelect;
export type NewUnclaimedRecord = typeof unclaimedRecord.$inferInsert;
export type RecordKind = (typeof recordKindEnum.enumValues)[number];

// ---------------------------------------------------------------------------
// Automatic discovery: company investor pages are crawled weekly for links to
// statement files, and every file found is tracked here.

export const statementStatusEnum = pgEnum("statement_status", [
  "pending",
  "imported",
  "unchanged",
  "no_records",
  "unsupported",
  "failed",
]);

export const companyPage = pgTable("company_page", {
  id: uuid("id").primaryKey().defaultRandom(),
  company: text("company").notNull(),
  url: text("url").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
  lastError: text("last_error"),
  linksFound: integer("links_found").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const statementFile = pgTable(
  "statement_file",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    company: text("company").notNull(),
    url: text("url").notNull().unique(),
    kind: recordKindEnum("kind").notNull(),
    financialYear: text("financial_year"),
    foundOn: text("found_on"),
    status: statementStatusEnum("status").notNull().default("pending"),
    lastHash: text("last_hash"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastError: text("last_error"),
    records: integer("records").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("statement_file_status_idx").on(t.status, t.lastCheckedAt)],
).enableRLS();
