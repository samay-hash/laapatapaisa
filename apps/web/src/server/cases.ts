import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { generateNameVariants } from "@/lib/name-variants";
import type { CreateCaseInput, CreateLeadInput } from "@/lib/validation/case";
import { db } from "@/server/db";
import { familyCase, lead, nameVariant, type LeadStatus } from "@/server/db/schema";
import { requireUser } from "@/server/session";

// Data access layer for cases. Every function resolves the signed-in user
// itself and scopes every query to that user. Never accept a user id from
// the caller.

async function ownedCaseId(caseId: string, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: familyCase.id })
    .from(familyCase)
    .where(and(eq(familyCase.id, caseId), eq(familyCase.userId, userId)))
    .limit(1);
  return row?.id ?? null;
}

export async function listCases() {
  const user = await requireUser();
  return db
    .select({
      id: familyCase.id,
      fullName: familyCase.fullName,
      relation: familyCase.relation,
      isLiving: familyCase.isLiving,
      updatedAt: familyCase.updatedAt,
      leadCount: sql<number>`count(${lead.id})`.mapWith(Number),
      foundRupees:
        sql<number>`coalesce(sum(${lead.amountRupees}) filter (where ${lead.status} in ('found', 'claimFiled', 'paid')), 0)`.mapWith(
          Number,
        ),
    })
    .from(familyCase)
    .leftJoin(lead, eq(lead.caseId, familyCase.id))
    .where(eq(familyCase.userId, user.id))
    .groupBy(familyCase.id)
    .orderBy(desc(familyCase.updatedAt));
}

export async function getCase(caseId: string) {
  const user = await requireUser();
  const [row] = await db
    .select()
    .from(familyCase)
    .where(and(eq(familyCase.id, caseId), eq(familyCase.userId, user.id)))
    .limit(1);
  if (!row) return null;

  const [variants, leads] = await Promise.all([
    db
      .select()
      .from(nameVariant)
      .where(eq(nameVariant.caseId, row.id))
      .orderBy(asc(nameVariant.createdAt)),
    db.select().from(lead).where(eq(lead.caseId, row.id)).orderBy(desc(lead.updatedAt)),
  ]);
  return { ...row, variants, leads };
}

export async function createCase(input: CreateCaseInput): Promise<string> {
  const user = await requireUser();
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(familyCase)
      .values({ ...input, userId: user.id })
      .returning({ id: familyCase.id });
    if (!created) throw new Error("Case was not created");

    const variants = generateNameVariants(input.fullName);
    if (variants.length > 0) {
      await tx
        .insert(nameVariant)
        .values(variants.map((value) => ({ caseId: created.id, value })))
        .onConflictDoNothing();
    }
    return created.id;
  });
}

export async function deleteCase(caseId: string): Promise<boolean> {
  const user = await requireUser();
  const deleted = await db
    .delete(familyCase)
    .where(and(eq(familyCase.id, caseId), eq(familyCase.userId, user.id)))
    .returning({ id: familyCase.id });
  return deleted.length > 0;
}

async function touchCase(caseId: string) {
  await db.update(familyCase).set({ updatedAt: new Date() }).where(eq(familyCase.id, caseId));
}

export async function addVariant(caseId: string, value: string): Promise<boolean> {
  const user = await requireUser();
  if (!(await ownedCaseId(caseId, user.id))) return false;
  await db.insert(nameVariant).values({ caseId, value, isCustom: true }).onConflictDoNothing();
  return true;
}

export async function removeVariant(caseId: string, variantId: string): Promise<boolean> {
  const user = await requireUser();
  if (!(await ownedCaseId(caseId, user.id))) return false;
  await db
    .delete(nameVariant)
    .where(and(eq(nameVariant.id, variantId), eq(nameVariant.caseId, caseId)));
  return true;
}

export async function addLead(caseId: string, input: CreateLeadInput): Promise<boolean> {
  const user = await requireUser();
  if (!(await ownedCaseId(caseId, user.id))) return false;
  await db.insert(lead).values({ ...input, caseId });
  await touchCase(caseId);
  return true;
}

export async function setLeadStatus(
  caseId: string,
  leadId: string,
  status: LeadStatus,
): Promise<boolean> {
  const user = await requireUser();
  if (!(await ownedCaseId(caseId, user.id))) return false;
  const updated = await db
    .update(lead)
    .set({ status })
    .where(and(eq(lead.id, leadId), eq(lead.caseId, caseId)))
    .returning({ id: lead.id });
  if (updated.length > 0) await touchCase(caseId);
  return updated.length > 0;
}

export async function deleteLead(caseId: string, leadId: string): Promise<boolean> {
  const user = await requireUser();
  if (!(await ownedCaseId(caseId, user.id))) return false;
  const deleted = await db
    .delete(lead)
    .where(and(eq(lead.id, leadId), eq(lead.caseId, caseId)))
    .returning({ id: lead.id });
  if (deleted.length > 0) await touchCase(caseId);
  return deleted.length > 0;
}
