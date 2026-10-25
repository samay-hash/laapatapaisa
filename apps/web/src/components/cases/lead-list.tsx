"use client";

import { useState, useTransition } from "react";
import { deleteLeadAction, setLeadStatusAction } from "@/app/(app)/cases/actions";
import { FormError } from "@/components/ui/field";
import { formatRupees, sourceLabel, statusLabel } from "@/lib/labels";
import { leadStatuses } from "@/lib/validation/case";
import type { Lead } from "@/server/db/schema";

const statusTone: Record<Lead["status"], string> = {
  clue: "border-rule text-ink-soft",
  searching: "border-royal/40 text-royal",
  found: "border-ledger/40 bg-ledger-wash/60 text-ledger",
  claimFiled: "border-stamp/40 text-stamp",
  paid: "border-ledger bg-ledger text-paper",
  deadEnd: "border-rule text-ink-faint line-through",
};

export function LeadList({ caseId, leads }: { caseId: string; leads: Lead[] }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (leads.length === 0) {
    return (
      <p className="mt-6 rounded-md border border-dashed border-rule px-5 py-8 text-center text-ink-soft">
        No leads yet. Scan an old paper above, or add a clue below, even a company name on an old
        letter.
      </p>
    );
  }

  return (
    <div className="mt-6" aria-busy={pending}>
      <FormError message={error} />
      <ul className="border-t-2 border-ink">
        {leads.map((l) => (
          <li
            key={l.id}
            className="grid gap-3 border-b border-rule py-5 sm:grid-cols-[1fr_auto] sm:gap-6"
          >
            <div className="min-w-0">
              <p className="text-sm text-ink-faint">{sourceLabel[l.source]}</p>
              <p className="mt-0.5 font-semibold text-ink">{l.title}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {[l.institution, l.reference ? `Ref. ${l.reference}` : null]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {l.amountRupees != null ? (
                <p className="mt-1 font-display text-lg text-ledger tabular-nums">
                  {formatRupees(l.amountRupees)}
                </p>
              ) : null}
            </div>
            <div className="flex items-start gap-3 sm:flex-col sm:items-end">
              <label className="sr-only" htmlFor={`status-${l.id}`}>
                Status of {l.title}
              </label>
              <select
                id={`status-${l.id}`}
                value={l.status}
                disabled={pending}
                onChange={(e) => {
                  const status = e.target.value;
                  setError(undefined);
                  startTransition(async () => {
                    const res = await setLeadStatusAction(caseId, l.id, status);
                    if (res.error) setError(res.error);
                  });
                }}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${statusTone[l.status]}`}
              >
                {leadStatuses.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[s]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`Delete the lead "${l.title}"?`)) return;
                  setError(undefined);
                  startTransition(async () => {
                    const res = await deleteLeadAction(caseId, l.id);
                    if (res.error) setError(res.error);
                  });
                }}
                className="text-sm text-ink-faint underline decoration-rule underline-offset-4 hover:text-[#a33a2b]"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
