"use client";

import { useState, useTransition } from "react";
import { deleteCaseAction } from "@/app/(app)/cases/actions";
import { FormError } from "@/components/ui/field";

export function DeleteCase({ caseId, name }: { caseId: string; name: string }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <section aria-labelledby="delete-title" className="border-t border-rule pt-8">
      <h2 id="delete-title" className="font-semibold text-ink">
        Delete this case
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        Removes {name}, every lead and every spelling from our systems. This cannot be undone.
      </p>
      <FormError message={error} />
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete the case for ${name}? This cannot be undone.`)) return;
          startTransition(async () => {
            const res = await deleteCaseAction(caseId);
            if (res?.error) setError(res.error);
          });
        }}
        className="mt-4 rounded-md border border-[#a33a2b]/50 px-4 py-2 text-sm font-semibold text-[#a33a2b] hover:bg-[#a33a2b]/[0.06] disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete case"}
      </button>
    </section>
  );
}
