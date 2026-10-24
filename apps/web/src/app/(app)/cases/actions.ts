"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createCaseSchema,
  createLeadSchema,
  leadStatuses,
  variantSchema,
} from "@/lib/validation/case";
import {
  addLead,
  addVariant,
  createCase,
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
