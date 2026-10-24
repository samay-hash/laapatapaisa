"use client";

import { useActionState, useState, useTransition } from "react";
import { addVariantAction, removeVariantAction, type FormState } from "@/app/(app)/cases/actions";
import { FormError, inputClass } from "@/components/ui/field";
import type { NameVariant } from "@/server/db/schema";

export function NameVariants({ caseId, variants }: { caseId: string; variants: NameVariant[] }) {
  const [state, action, adding] = useActionState<FormState, FormData>(
    addVariantAction.bind(null, caseId),
    {},
  );
  const [copied, setCopied] = useState<string>();
  const [error, setError] = useState<string>();
  const [removing, startTransition] = useTransition();

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied((c) => (c === value ? undefined : c)), 1500);
    } catch {
      setError("Copying is blocked in this browser. Select the name and copy it by hand.");
    }
  }

  return (
    <section aria-labelledby="variants-title">
      <h2 id="variants-title" className="font-display text-2xl font-medium text-ink">
        Names to search
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        Old records rarely match the full name. Try each of these on every portal.
      </p>
      <FormError message={error ?? state.error} />
      <ul className="mt-4 border-t border-rule">
        {variants.map((v) => (
          <li
            key={v.id}
            className="group flex items-center justify-between gap-3 border-b border-rule py-2.5"
          >
            <span className="min-w-0 truncate text-ink">{v.value}</span>
            <span className="flex shrink-0 items-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => copy(v.value)}
                className="text-royal underline decoration-royal/30 underline-offset-4 hover:decoration-royal"
              >
                {copied === v.value ? "Copied" : "Copy"}
                <span className="sr-only"> {v.value}</span>
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={() =>
                  startTransition(async () => {
                    const res = await removeVariantAction(caseId, v.id);
                    if (res.error) setError(res.error);
                  })
                }
                className="text-ink-faint hover:text-[#a33a2b]"
                aria-label={`Remove ${v.value}`}
              >
                Remove
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form action={action} className="mt-4 flex gap-2">
        <label htmlFor="variant-value" className="sr-only">
          Add another spelling
        </label>
        <input
          id="variant-value"
          name="value"
          placeholder="Add another spelling"
          maxLength={120}
          required
          className={`${inputClass} py-2.5`}
          aria-invalid={state.fieldErrors?.value ? true : undefined}
        />
        <button
          type="submit"
          disabled={adding}
          className="shrink-0 rounded-md border border-ink/70 px-4 font-semibold text-ink hover:bg-paper-deep disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {state.fieldErrors?.value ? (
        <p className="mt-2 text-sm text-[#a33a2b]" role="alert">
          {state.fieldErrors.value}
        </p>
      ) : null}
    </section>
  );
}
