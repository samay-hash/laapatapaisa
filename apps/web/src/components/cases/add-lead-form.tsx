"use client";

import { useActionState } from "react";
import { addLeadAction, type FormState } from "@/app/(app)/cases/actions";
import { buttonClass } from "@/components/ui/button";
import { describedBy, Field, FormError, inputClass } from "@/components/ui/field";
import { sourceLabel, statusLabel } from "@/lib/labels";
import { leadSources, leadStatuses } from "@/lib/validation/case";

export function AddLeadForm({ caseId }: { caseId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    addLeadAction.bind(null, caseId),
    {},
  );
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};

  return (
    <details
      className="group mt-8 rounded-md border border-paper-edge bg-[#fbf7ec]"
      open={Boolean(state.fieldErrors)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
        Add a lead
        <span
          aria-hidden="true"
          className="font-display text-2xl leading-none text-ink-soft transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <form action={action} className="space-y-6 border-t border-paper-edge px-5 py-6" noValidate>
        <FormError message={state.error} />
        {state.ok ? (
          <p role="status" className="text-sm text-ledger">
            Lead added.
          </p>
        ) : null}
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Where does it sit?" htmlFor="source" error={e.source}>
            <select
              id="source"
              name="source"
              defaultValue={v.source ?? ""}
              required
              className={inputClass}
              {...describedBy("source", { error: e.source })}
            >
              <option value="" disabled>
                Choose one
              </option>
              {leadSources.map((s) => (
                <option key={s} value={s}>
                  {sourceLabel[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" htmlFor="status" error={e.status}>
            <select
              id="status"
              name="status"
              defaultValue={v.status ?? "clue"}
              className={inputClass}
            >
              {leadStatuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="What did you find?"
          htmlFor="title"
          hint="For example: Dividend letter from a cement company, 1996"
          error={e.title}
        >
          <input
            id="title"
            name="title"
            defaultValue={v.title}
            maxLength={160}
            required
            className={inputClass}
            {...describedBy("title", { hint: true, error: e.title })}
          />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            label="Bank, company or insurer"
            htmlFor="institution"
            hint="Optional"
            error={e.institution}
          >
            <input
              id="institution"
              name="institution"
              defaultValue={v.institution}
              maxLength={120}
              className={inputClass}
              {...describedBy("institution", { hint: true, error: e.institution })}
            />
          </Field>
          <Field
            label="Reference number"
            htmlFor="reference"
            hint="Folio, policy or account. Optional"
            error={e.reference}
          >
            <input
              id="reference"
              name="reference"
              defaultValue={v.reference}
              maxLength={80}
              autoComplete="off"
              className={inputClass}
              {...describedBy("reference", { hint: true, error: e.reference })}
            />
          </Field>
        </div>
        <Field
          label="Amount in rupees"
          htmlFor="amountRupees"
          hint="If known. Whole rupees, no commas"
          error={e.amountRupees}
        >
          <input
            id="amountRupees"
            name="amountRupees"
            defaultValue={v.amountRupees}
            inputMode="numeric"
            className={`${inputClass} sm:max-w-60`}
            {...describedBy("amountRupees", { hint: true, error: e.amountRupees })}
          />
        </Field>
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Adding…" : "Add lead"}
        </button>
      </form>
    </details>
  );
}
