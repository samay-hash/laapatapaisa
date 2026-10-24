import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AddLeadForm } from "@/components/cases/add-lead-form";
import { DeleteCase } from "@/components/cases/delete-case";
import { LeadList } from "@/components/cases/lead-list";
import { NameVariants } from "@/components/cases/name-variants";
import { sources } from "@/content/sources";
import { formatRupees, relationLabel } from "@/lib/labels";
import { nameParts } from "@/lib/name-variants";
import { getCase } from "@/server/cases";

export const metadata: Metadata = { title: "Case" };

export default function CasePage({ params }: PageProps<"/cases/[id]">) {
  return (
    <Suspense fallback={<p className="text-ink-faint">Loading case…</p>}>
      <CaseView params={params} />
    </Suspense>
  );
}

async function CaseView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const c = await getCase(id);
  if (!c) notFound();

  const found = c.leads
    .filter((l) => l.status === "found" || l.status === "claimFiled" || l.status === "paid")
    .reduce((sum, l) => sum + (l.amountRupees ?? 0), 0);
  const searchedSources = new Set(c.leads.map((l) => l.source));
  const notYetSearched = sources.filter((s) => !searchedSources.has(s.id));

  const facts = [
    relationLabel[c.relation],
    c.isLiving ? "Living" : "Passed away",
    c.birthYear || c.deathYear
      ? `${c.birthYear ?? "?"} to ${c.deathYear ?? (c.isLiving ? "present" : "?")}`
      : null,
    c.cities.length ? c.cities.join(", ") : null,
    c.occupation,
  ].filter(Boolean);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-double border-rule pb-8">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-[-0.015em] text-ink sm:text-5xl">
            {c.fullName}
          </h1>
          <p className="mt-3 text-ink-soft">{facts.join(", ")}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-sm text-ink-faint">Found so far</p>
          <p className="font-display text-3xl font-medium text-ledger tabular-nums">
            {formatRupees(found)}
          </p>
        </div>
      </header>

      <div className="mt-10 grid gap-14 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <section aria-labelledby="leads-title">
          <h2 id="leads-title" className="font-display text-2xl font-medium text-ink">
            Leads
          </h2>
          <p className="mt-1 text-ink-soft">
            Every clue, search and claim for {nameParts(c.fullName)[0] ?? c.fullName}, in one place.
          </p>
          <LeadList caseId={c.id} leads={c.leads} />
          <AddLeadForm caseId={c.id} />
        </section>

        <aside className="space-y-12">
          <NameVariants caseId={c.id} variants={c.variants} />

          {notYetSearched.length > 0 ? (
            <section aria-labelledby="next-title">
              <h2 id="next-title" className="font-display text-2xl font-medium text-ink">
                Not searched yet
              </h2>
              <ul className="mt-4 border-t border-rule">
                {notYetSearched.map((s) => (
                  <li key={s.id} className="border-b border-rule py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-semibold text-ink">{s.name}</span>
                      <a
                        href={s.officialLink.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-sm font-semibold text-royal underline decoration-royal/30 underline-offset-4 hover:decoration-royal"
                      >
                        {s.officialLink.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.howToSearch}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <DeleteCase caseId={c.id} name={c.fullName} />
        </aside>
      </div>
    </div>
  );
}
