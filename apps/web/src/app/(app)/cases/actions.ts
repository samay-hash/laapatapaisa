"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createCaseSchema,
  createLeadSchema,
  leadStatuses,
  relations,
  variantSchema,
} from "@/lib/validation/case";
import { leadTitleFor, ScannedDocument, sourceFor } from "@/lib/scan/document";
import { confirmRecord, RateLimitError } from "@/server/records-search";
import { getCurrentUser } from "@/server/session";
import {
  addLead,
  addVariant,
  createCase,
  listCases,
  deleteCase,
  deleteLead,
  removeVariant,
  setLeadStatus,
} from "@/server/cases";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  // Submitted values, so a form keeps what was typed when validation fails.
  values?: Record<string, string>;
};

function submitted(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData) if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  return out;
}

const id = z.uuid();

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

const NOT_FOUND = "This case no longer exists, or it is not yours.";

export async function createCaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = createCaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error), values: submitted(formData) };
  }

  const caseId = await createCase(parsed.data);
  redirect(`/cases/${caseId}`);
}

export async function deleteCaseAction(caseId: string): Promise<FormState> {
  if (!id.safeParse(caseId).success) return { error: NOT_FOUND };
  if (!(await deleteCase(caseId))) return { error: NOT_FOUND };
  redirect("/dashboard");
}

export async function addLeadAction(
  caseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!id.safeParse(caseId).success) return { error: NOT_FOUND };
  const parsed = createLeadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error), values: submitted(formData) };
  }

  if (!(await addLead(caseId, parsed.data))) return { error: NOT_FOUND };
  refresh();
  return { ok: true };
}

export async function setLeadStatusAction(
  caseId: string,
  leadId: string,
  status: string,
): Promise<FormState> {
  const parsed = z.enum(leadStatuses).safeParse(status);
  if (!id.safeParse(caseId).success || !id.safeParse(leadId).success || !parsed.success) {
    return { error: "That change could not be saved. Reload the page and try again." };
  }
  if (!(await setLeadStatus(caseId, leadId, parsed.data))) return { error: NOT_FOUND };
  refresh();
  return { ok: true };
}

export async function deleteLeadAction(caseId: string, leadId: string): Promise<FormState> {
  if (!id.safeParse(caseId).success || !id.safeParse(leadId).success) return { error: NOT_FOUND };
  if (!(await deleteLead(caseId, leadId))) return { error: NOT_FOUND };
  refresh();
  return { ok: true };
}

export async function addVariantAction(
  caseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!id.safeParse(caseId).success) return { error: NOT_FOUND };
  const parsed = variantSchema.safeParse(formData.get("value"));
  if (!parsed.success) return { fieldErrors: { value: parsed.error.issues[0]?.message ?? "" } };

  if (!(await addVariant(caseId, parsed.data))) return { error: NOT_FOUND };
  refresh();
  return { ok: true };
}

export async function removeVariantAction(caseId: string, variantId: string): Promise<FormState> {
  if (!id.safeParse(caseId).success || !id.safeParse(variantId).success)
    return { error: NOT_FOUND };
  if (!(await removeVariant(caseId, variantId))) return { error: NOT_FOUND };
  refresh();
  return { ok: true };
}

const kindLabel: Record<string, string> = {
  unclaimed_dividend: "Unclaimed dividend",
  shares_transferred_to_iepf: "Shares moved to IEPF",
  other: "Unclaimed amount",
};

const saveRecordInput = z.object({
  recordId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  father: z.string().trim().max(120).default(""),
  caseId: z.uuid().optional(),
  relation: z.enum(relations).optional(),
  isLiving: z.boolean().optional(),
});

/**
 * Adds a confirmed public record to a case as a "found" lead, creating the case
 * first when needed. Re-confirms the record on the server; never trusts the client.
 */
export async function saveRecordAction(
  input: z.input<typeof saveRecordInput>,
): Promise<FormState & { caseId?: string }> {
  const parsed = saveRecordInput.safeParse(input);
  if (!parsed.success) return { error: "Choose a case, or say how they are related to you." };
  const { recordId, name, father, relation, isLiving } = parsed.data;

  let record;
  try {
    record = await confirmRecord(recordId, name, father);
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    throw error;
  }
  if (record === "signin") return { error: "Log in to save this record." };
  if (record === "mismatch" || record === null)
    return { error: "This record could not be confirmed." };

  let caseId = parsed.data.caseId;
  if (!caseId) {
    if (!relation || isLiving === undefined) {
      return { error: "Say how they are related to you, and whether they are living." };
    }
    caseId = await createCase({
      fullName: name,
      relation,
      isLiving: relation === "self" ? true : isLiving,
      birthYear: null,
      deathYear: null,
      cities: [],
      occupation: null,
    });
  }

  const ok = await addLead(caseId, {
    source: "shares",
    status: "found",
    title: `${kindLabel[record.kind] ?? "Unclaimed amount"}: ${record.company}${record.financialYear ? ` (${record.financialYear} list)` : ""}`,
    institution: record.company,
    reference: record.folio,
    amountRupees: record.amountPaise == null ? null : Math.round(record.amountPaise / 100),
  });
  if (!ok) return { error: NOT_FOUND };
  return { ok: true, caseId };
}

/** The signed-in user's cases, for choosing where to save a record. Empty when signed out. */
export async function myCasesAction(): Promise<{ id: string; fullName: string }[]> {
  if (!(await getCurrentUser())) return [];
  return (await listCases()).map((c) => ({ id: c.id, fullName: c.fullName }));
}

/**
 * Saves a scanned paper to a case as a lead. The scan result comes from the
 * browser, so it is validated again here; the holder's name, if new, is added
 * to the names to search.
 */
export async function addScannedLeadAction(caseId: string, input: unknown): Promise<FormState> {
  if (!id.safeParse(caseId).success) return { error: NOT_FOUND };
  const parsed = ScannedDocument.safeParse(input);
  if (!parsed.success || parsed.data.documentType === "not_a_financial_paper") {
    return { error: "This scan cannot be saved. Scan the paper again." };
  }
  const doc = parsed.data;
  const reference =
    doc.references
      .map((r) => `${r.label} ${r.value}`)
      .join(", ")
      .slice(0, 80) || null;
  const ok = await addLead(caseId, {
    source: sourceFor(doc.documentType),
    status: "clue",
    title: leadTitleFor(doc).slice(0, 160),
    institution: doc.institution?.slice(0, 120) ?? null,
    reference,
    amountRupees: doc.amountRupees == null ? null : Math.round(doc.amountRupees),
  });
  if (!ok) return { error: NOT_FOUND };
  if (doc.holderName && doc.holderName.trim().length >= 2) {
    await addVariant(caseId, doc.holderName.trim().slice(0, 120));
  }
  refresh();
  return { ok: true };
}
