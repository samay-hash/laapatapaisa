import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClass } from "@/components/ui/button";
import { formatRupees, relationLabel } from "@/lib/labels";
import { listCases } from "@/server/cases";

export const metadata: Metadata = { title: "Your cases" };

export default function DashboardPage() {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-[-0.015em] text-ink">
            Your cases
          </h1>
          <p className="mt-2 text-ink-soft">
            One case for each person whose money you are tracing.
          </p>
        </div>
        <Link href="/cases/new" className={buttonClass("primary")}>
          Add a person
        </Link>
      </div>
      <Suspense fallback={<p className="mt-12 text-ink-faint">Loading your cases…</p>}>
        <CaseList />
      </Suspense>
    </div>
  );
}

async function CaseList() {
  const cases = await listCases();

  if (cases.length === 0) {
    return (
      <div className="mt-12 rounded-md border border-dashed border-rule px-6 py-14 text-center">
        <h2 className="font-display text-2xl font-medium text-ink">Start with one name</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">
          Add the person whose money you want to trace. We will prepare the spellings to search and
          a place to record every lead.
        </p>
        <Link href="/cases/new" className={buttonClass("primary", "mt-6")}>
          Add a person
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-10 border-t-2 border-ink">
      {cases.map((c) => (
        <li key={c.id} className="border-b border-rule">
          <Link
            href={`/cases/${c.id}`}
            className="grid gap-1 py-5 transition-colors hover:bg-paper-deep/50 sm:grid-cols-[1fr_auto_auto] sm:items-baseline sm:gap-10 sm:px-2"
          >
            <span>
              <span className="font-display text-xl font-medium text-ink">{c.fullName}</span>
              <span className="ml-3 text-sm text-ink-faint">
                {relationLabel[c.relation]}
                {c.isLiving ? "" : ", passed away"}
              </span>
            </span>
            <span className="text-sm text-ink-soft">
              {c.leadCount === 1 ? "1 lead" : `${c.leadCount} leads`}
            </span>
            <span className="font-display text-lg text-ledger tabular-nums">
              {c.foundRupees > 0 ? `${formatRupees(c.foundRupees)} found` : ""}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
