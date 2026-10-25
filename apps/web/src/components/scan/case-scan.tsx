"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addScannedLeadAction } from "@/app/(app)/cases/actions";
import { queueNameSearch } from "@/components/search/shared";
import { buttonClass } from "@/components/ui/button";
import { pinFrom } from "@/lib/scan/document";
import { ScanPaper } from "./scan-paper";

export function CaseScan({ caseId, enabled }: { caseId: string; enabled: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<{ saving?: boolean; saved?: boolean; error?: string }>({});

  return (
    <ScanPaper
      enabled={enabled}
      renderActions={(doc, reset) => {
        const pin = pinFrom(doc);
        return (
          <>
            {state.error ? <p className="w-full text-sm text-[#a33a2b]">{state.error}</p> : null}
            {state.saved ? (
              <p role="status" className="text-sm font-semibold text-ledger">
                Added to this case.
              </p>
            ) : (
              <button
                type="button"
                disabled={state.saving}
                onClick={async () => {
                  setState({ saving: true });
                  const res = await addScannedLeadAction(caseId, doc);
                  setState(res.ok ? { saved: true } : { error: res.error });
                  if (res.ok) setTimeout(() => (reset(), setState({})), 1600);
                }}
                className={buttonClass("primary", "px-4 py-2.5 text-sm")}
              >
                {state.saving ? "Adding…" : "Add as a lead"}
              </button>
            )}
            {pin && doc.holderName ? (
              <button
                type="button"
                onClick={() => {
                  queueNameSearch(pin, doc.holderName!);
                  router.push(`/search?pin=${pin}`);
                }}
                className="rounded-md border border-royal/50 px-4 py-2.5 text-sm font-semibold text-royal transition-colors hover:bg-royal hover:text-paper"
              >
                Search records for {pin}
              </button>
            ) : null}
          </>
        );
      }}
    />
  );
}
