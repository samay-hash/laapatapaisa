// A "case" is one family member whose money we are trying to find.
// Leads are the possible places it sits, from first clue to money paid.
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const relationEnum = pgEnum("relation", [
  "parent",
  "grandparent",
  "spouse",
  "relative",
  "self",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "bank",
  "shares",
  "insurance",
  "mutualFunds",
  "providentFund",
  "postOffice",
  "other",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "clue",
  "searching",
  "found",
  "claimFiled",
  "paid",
  "deadEnd",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const familyCase = pgTable(
  "case",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    relation: relationEnum("relation").notNull(),
    isLiving: boolean("is_living").notNull(),
    birthYear: integer("birth_year"),
    deathYear: integer("death_year"),
    cities: text("cities").array().notNull().default([]),
    occupation: text("occupation"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("case_user_id_idx").on(t.userId)],
);

export const nameVariant = pgTable(
  "name_variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => familyCase.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    isCustom: boolean("is_custom").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("name_variant_case_value_idx").on(t.caseId, t.value)],
);

export const lead = pgTable(
  "lead",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => familyCase.id, { onDelete: "cascade" }),
    source: leadSourceEnum("source").notNull(),
    title: text("title").notNull(),
    institution: text("institution"),
    reference: text("reference"),
    // Whole rupees. Claims are never fractional and this avoids float errors.
    amountRupees: bigint("amount_rupees", { mode: "number" }),
    status: leadStatusEnum("status").notNull().default("clue"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("lead_case_id_idx").on(t.caseId)],
);

export type FamilyCase = typeof familyCase.$inferSelect;
export type NameVariant = typeof nameVariant.$inferSelect;
export type Lead = typeof lead.$inferSelect;
export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];
export type LeadSource = (typeof leadSourceEnum.enumValues)[number];
export type Relation = (typeof relationEnum.enumValues)[number];
