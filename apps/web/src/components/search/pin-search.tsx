"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FormError } from "@/components/ui/field";
import type { PinSummary } from "@/server/records-search";
import { AreaReport } from "./area-report";
import { NameSearch } from "./name-search";
import { PinBoxes } from "./pin-boxes";
import { getJson, isPin } from "./shared";

export function PinSearch() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pin, setPin] = useState(() => {
    const p = params.get("pin") ?? "";
    return isPin(p) ? p : "";
  });

  // The latest lookup, tagged with its PIN so a stale answer never shows.
  const [lookup, setLookup] = useState<{
    pin: string;
    summary?: PinSummary;
    error?: string;
  } | null>(null);
  const valid = isPin(pin);
  const current = valid && lookup?.pin === pin ? lookup : null;
  const loading = valid && !current;
  const summary = current?.summary ?? null;

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    getJson<PinSummary>(`/api/records/summary?pin=${pin}`).then((r) => {
      if (!cancelled) setLookup({ pin, summary: r.data, error: r.error });
    });
    router.replace(`${pathname}?pin=${pin}`, { scroll: false });
    return () => {
      cancelled = true;
    };
  }, [pin, valid, pathname, router]);

  return (
    <div>
      {/* Search console */}
      <div className="rounded-2xl border border-paper-edge bg-paper-deep/50 p-6 sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-end lg:gap-14">
          <div>
            <p id="pin-label" className="font-semibold text-ink">
              PIN code where they lived
            </p>
            <div className="mt-3">
              <PinBoxes value={pin} onChange={setPin} autoFocus={!pin} />
            </div>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-ink-soft lg:pb-1">
            Old records carry the PIN of the address the family had then. If they moved, try each
            place they lived.
          </p>
        </div>
      </div>

      <div aria-live="polite">
        {loading ? <LoadingState pin={pin} /> : null}
        {current?.error ? (
          <div className="mt-8">
            <FormError message={current.error} />
          </div>
        ) : null}
      </div>

      {summary && !loading ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div className="lg:sticky lg:top-8 lg:self-start">
            <AreaReport summary={summary} onPickPin={setPin} />
          </div>
          <div>
            {summary.records > 0 ? (
              <NameSearch key={summary.pinCode} pin={summary.pinCode} />
            ) : (
              <EmptyGuide hasNearby={summary.nearby.length > 0} />
            )}
          </div>
        </div>
      ) : null}

      {!valid ? <BeforeSearch /> : null}
    </div>
  );
}

function LoadingState({ pin }: { pin: string }) {
  return (
    <div
      className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14"
      aria-busy="true"
    >
      <div className="h-80 animate-pulse rounded-xl border border-paper-edge bg-paper-deep/50" />
      <div className="space-y-4">
        <p className="text-ink-faint">Looking up {pin}…</p>
        <div className="h-13 animate-pulse rounded-md bg-paper-deep/60" />
      </div>
    </div>
  );
}

function EmptyGuide({ hasNearby }: { hasNearby: boolean }) {
  return (
    <section className="lg:pt-2">
      <h2 className="font-display text-[1.65rem] leading-tight font-medium text-ink">
        What you can do now
      </h2>
      <ol className="mt-6 space-y-6">
        {[
          hasNearby
            ? [
                "Try a nearby PIN",
                "Families often had shares registered at a post office in the next town. Pick one from the list.",
              ]
            : [
                "Try another PIN",
                "Old papers may carry the PIN of a town where they lived or worked earlier.",
              ],
          [
            "Check other kinds of money",
            "Bank deposits, insurance and PF are searched on their own portals. The free check tells you which ones to try.",
          ],
          [
            "Come back next week",
            "New company lists are added every week, and searches cover them as soon as they are in.",
          ],
        ].map(([title, body], i) => (
          <li key={title} className="grid grid-cols-[2.25rem_1fr] gap-4">
            <span className="grid size-9 place-items-center rounded-full border border-ink/20 font-display text-ink tabular-nums">
              {i + 1}
            </span>
            <div className="pt-1">
              <p className="font-semibold text-ink">{title}</p>
              <p className="mt-1 leading-relaxed text-ink-soft">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function BeforeSearch() {
  const points = [
    [
      "The total for the area",
      "How much unclaimed dividend money is listed for that PIN, and with which companies.",
    ],
    [
      "Names, privately",
      "As you type a first name you see how many records share it. Full records appear only to signed-in families.",
    ],
    [
      "One click to your case",
      "Confirm the father’s name and the record is saved as a lead, with the folio and amount filled in.",
    ],
  ];
  return (
    <ul className="mt-12 grid gap-8 border-t border-rule pt-10 sm:grid-cols-3 sm:gap-10">
      {points.map(([title, body]) => (
        <li key={title}>
          <p className="font-semibold text-ink">{title}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
        </li>
      ))}
    </ul>
  );
}
