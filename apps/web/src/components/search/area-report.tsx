"use client";

import Link from "next/link";
import { useState } from "react";
import type { PinSummary } from "@/server/records-search";
import { rupees } from "./shared";

export function AreaReport({
  summary,
  onPickPin,
}: {
  summary: PinSummary;
  onPickPin: (pin: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const empty = summary.records === 0;
  const maxCompany = Math.max(1, ...summary.topCompanies.map((c) => c.amountPaise));

  async function share() {
    const url = `${window.location.origin}/search?pin=${summary.pinCode}`;
    const text = `${rupees(summary.amountPaise)} is lying unclaimed in ${summary.records} records for PIN ${summary.pinCode}${summary.place ? ` (${summary.place})` : ""}. Check if your family’s name is there.`;
    if (navigator.share) {
      await navigator.share({ title: "LaapataPaisa", text, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <article className="overflow-hidden rounded-xl border border-paper-edge bg-[#fbf7ec] shadow-[0_1px_0_var(--color-paper-edge),0_20px_40px_-32px_rgb(28_34_48/0.4)]">
      <header className="border-b border-paper-edge px-6 pt-6 pb-5 sm:px-8">
        <p className="text-sm text-ink-faint">PIN {summary.pinCode}</p>
        <h2 className="mt-1 font-display text-[1.65rem] leading-tight font-medium text-ink">
          {summary.place ?? "Unknown area"}
        </h2>
      </header>

      {empty ? (
        <div className="px-6 py-7 sm:px-8">
          <p className="font-semibold text-ink">Nothing listed for this PIN yet</p>
          <p className="mt-2 leading-relaxed text-ink-soft">
            None of the {summary.coverage.companies} company lists indexed so far name an address
            here. New lists are added every week.
          </p>
        </div>
      ) : (
        <div className="px-6 py-7 sm:px-8">
          <p className="font-display text-5xl leading-none font-medium tracking-[-0.02em] text-ledger tabular-nums">
            {rupees(summary.amountPaise)}
          </p>
          <p className="mt-3 text-ink-soft">
            unclaimed in{" "}
            <span className="font-semibold text-ink">
              {summary.records.toLocaleString("en-IN")}{" "}
              {summary.records === 1 ? "record" : "records"}
            </span>{" "}
            across {summary.companies} {summary.companies === 1 ? "company" : "companies"}
          </p>

          <ul className="mt-7 space-y-4">
            {summary.topCompanies.map((c) => (
              <li key={c.company}>
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="truncate text-ink">{c.company}</span>
                  <span className="shrink-0 text-ink-soft tabular-nums">
                    {c.amountPaise > 0
                      ? rupees(c.amountPaise)
                      : `${c.records} share ${c.records === 1 ? "record" : "records"}`}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-edge/70">
                  <div
                    className="h-full rounded-full bg-ledger/70"
                    style={{ width: `${Math.max(3, (c.amountPaise / maxCompany) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={share}
            className="mt-7 inline-flex items-center gap-2 rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink/40"
          >
            {copied ? "Link copied" : "Share this area’s total"}
          </button>
        </div>
      )}

      {summary.nearby.length > 0 ? (
        <section className="border-t border-paper-edge bg-paper-deep/40 px-6 py-6 sm:px-8">
          <h3 className="text-sm font-semibold text-ink">
            {empty ? "Nearby PINs with records" : "Also listed nearby"}
          </h3>
          <ul className="mt-3 divide-y divide-paper-edge">
            {summary.nearby.map((n) => (
              <li key={n.pinCode}>
                <button
                  type="button"
                  onClick={() => onPickPin(n.pinCode)}
                  className="group flex w-full items-center justify-between gap-4 py-3 text-left"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-semibold text-ink tabular-nums group-hover:text-royal">
                      {n.pinCode}
                    </span>
                    <span className="ml-2 text-sm text-ink-faint">{n.place ?? ""}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm whitespace-nowrap text-ink-soft tabular-nums">
                    {n.records} {n.records === 1 ? "record" : "records"}
                    {n.amountPaise > 0 ? (
                      <span className="ml-3 text-ledger">{rupees(n.amountPaise)}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="border-t border-paper-edge px-6 py-4 text-xs leading-relaxed text-ink-faint sm:px-8">
        From the public unclaimed-dividend lists of {summary.coverage.companies} companies (
        {summary.coverage.records.toLocaleString("en-IN")} records). Bank deposits, insurance and PF
        are not in these lists; the{" "}
        <Link href="/check" className="text-royal underline underline-offset-2">
          free check
        </Link>{" "}
        covers those.
      </footer>
    </article>
  );
}
