"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { myCasesAction, saveRecordAction } from "@/app/(app)/cases/actions";
import { buttonClass } from "@/components/ui/button";
import { FormError, inputClass } from "@/components/ui/field";
import { formatRupees, relationLabel } from "@/lib/labels";
import { relations } from "@/lib/validation/case";
import type {
  ConfirmedRecord,
  FirstNameSuggestion,
  PinSummary,
  RecordMatch,
} from "@/server/records-search";

const PENDING_KEY = "lp.pendingSearch";

const rupees = (paise: number | null) =>
  paise == null ? null : formatRupees(Math.round(paise / 100));

const strengthLabel: Record<RecordMatch["strength"], string> = {
  exact: "Same name",
  strong: "Very likely",
  possible: "Possible, initials only",
};

const strengthTone: Record<RecordMatch["strength"], string> = {
  exact: "border-ledger/40 bg-ledger-wash/70 text-ledger",
  strong: "border-royal/40 text-royal",
  possible: "border-rule text-ink-soft",
};

const kindLabel: Record<string, string> = {
  unclaimed_dividend: "Unclaimed dividend",
  shares_transferred_to_iepf: "Shares moved to IEPF",
  other: "Unclaimed amount",
};

async function getJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => ({}));
    return res.ok
      ? { data: body as T, status: res.status }
      : { error: body.error ?? "Something went wrong.", status: res.status };
  } catch {
    return { error: "Could not reach the server. Check your connection.", status: 0 };
  }
}

export function PinSearch() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pin, setPin] = useState(params.get("pin") ?? "");
  // The latest lookup, tagged with its PIN so stale results never show.
  const [lookup, setLookup] = useState<{
    pin: string;
    summary?: PinSummary;
    error?: string;
  } | null>(null);
  const validPin = /^[1-9]\d{5}$/.test(pin);
  const current = validPin && lookup?.pin === pin ? lookup : null;
  const loadingSummary = validPin && !current;
  const summary = current?.summary ?? null;
  const summaryError = current?.error;

  useEffect(() => {
    if (!validPin) return;
    let cancelled = false;
    getJson<PinSummary>(`/api/records/summary?pin=${pin}`).then((r) => {
      if (!cancelled) setLookup({ pin, summary: r.data, error: r.error });
    });
    router.replace(`${pathname}?pin=${pin}`, { scroll: false });
    return () => {
      cancelled = true;
    };
  }, [pin, validPin, pathname, router]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <label htmlFor="pin" className="block text-[0.95rem] font-semibold text-ink">
        PIN code where they lived
      </label>
      <input
        id="pin"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="852215"
        className={`${inputClass} mt-2 max-w-60 font-display text-2xl tracking-[0.2em]`}
        aria-describedby="pin-help"
      />
      <p id="pin-help" className="mt-2 text-sm text-ink-faint">
        Old records carry the PIN of the address the family had then. Try each place they lived.
      </p>

      <div aria-live="polite" className="mt-10">
        {loadingSummary ? <p className="text-ink-faint">Looking up {pin}…</p> : null}
        <FormError message={summaryError} />
        {summary && !loadingSummary ? <SummaryCard summary={summary} /> : null}
      </div>

      {summary && summary.records > 0 && !loadingSummary ? (
        <NameSearch pin={summary.pinCode} />
      ) : null}
    </div>
  );
}

function SummaryCard({ summary }: { summary: PinSummary }) {
  const [copied, setCopied] = useState(false);
  const place = summary.place ? `${summary.pinCode}, ${summary.place}` : summary.pinCode;

  if (summary.records === 0) {
    return (
      <section className="rounded-md border border-paper-edge bg-[#fbf7ec] p-6 sm:p-8">
        <h2 className="font-display text-2xl font-medium text-ink">{place}</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          No records for this PIN in the lists indexed so far: {summary.coverage.companies}{" "}
          {summary.coverage.companies === 1 ? "company" : "companies"},{" "}
          {summary.coverage.records.toLocaleString("en-IN")} records. More company lists are added
          every week, so check again soon.
        </p>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Bank deposits, insurance and PF are not in these lists. The{" "}
          <Link href="/check" className="text-royal underline underline-offset-4">
            free check
          </Link>{" "}
          shows where to search for those.
        </p>
      </section>
    );
  }

  async function share() {
    const url = `${window.location.origin}/search?pin=${summary.pinCode}`;
    const text = `${rupees(summary.amountPaise)} is lying unclaimed in ${summary.records} records for PIN ${summary.pinCode}. Check if your family’s name is there.`;
    if (navigator.share) {
      await navigator.share({ title: "LaapataPaisa", text, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <section className="rounded-md border border-paper-edge bg-[#fbf7ec] p-6 sm:p-8">
      <p className="text-sm text-ink-faint">{place}</p>
      <p className="mt-2 font-display text-4xl font-medium text-ledger tabular-nums sm:text-5xl">
        {rupees(summary.amountPaise)}
      </p>
      <p className="mt-2 text-lg text-ink">
        unclaimed in {summary.records.toLocaleString("en-IN")}{" "}
        {summary.records === 1 ? "record" : "records"} from {summary.companies}{" "}
        {summary.companies === 1 ? "company" : "companies"}
      </p>
      <button type="button" onClick={share} className={buttonClass("quiet", "mt-5")}>
        {copied ? "Copied" : "Share this PIN’s total"}
      </button>
    </section>
  );
}

function NameSearch({ pin }: { pin: string }) {
  const listId = useId();
  const [name, setName] = useState("");
  const [fetched, setFetched] = useState<{ q: string; list: FirstNameSuggestion[] }>({
    q: "",
    list: [],
  });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [matches, setMatches] = useState<RecordMatch[] | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState<string>();
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchedName = useRef("");

  // Restore a search started before logging in.
  const [pending] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null") as {
        pin: string;
        name: string;
      } | null;
      if (saved?.pin === pin && saved.name) {
        sessionStorage.removeItem(PENDING_KEY);
        return saved.name;
      }
    } catch {
      // Storage unavailable: nothing to restore.
    }
    return null;
  });
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => {
      setName(pending);
      void find(pending);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  // Suggestions only while typing the first word.
  const firstWord = name.trimStart().split(/\s+/)[0] ?? "";
  const typingFirst = !name.trimStart().includes(" ");
  const wantSuggestions = typingFirst && firstWord.length >= 2;
  const suggestions = wantSuggestions && fetched.q === firstWord ? fetched.list : [];
  useEffect(() => {
    if (!wantSuggestions) return;
    const t = setTimeout(async () => {
      const r = await getJson<FirstNameSuggestion[]>(
        `/api/records/suggest?pin=${pin}&q=${encodeURIComponent(firstWord)}`,
      );
      setFetched({ q: firstWord, list: r.data ?? [] });
      setActive(-1);
    }, 220);
    return () => clearTimeout(t);
  }, [firstWord, wantSuggestions, pin]);

  function choose(s: FirstNameSuggestion) {
    setName(`${s.name} `);
    setOpen(false);
    inputRef.current?.focus();
  }

  async function find(value = name) {
    const full = value.trim();
    if (full.split(/\s+/).length < 2) {
      setError("Add the surname too, for example: Mahendra Mehta.");
      return;
    }
    setError(undefined);
    setNeedsLogin(false);
    setSearching(true);
    searchedName.current = full;
    const r = await getJson<RecordMatch[]>("/api/records/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, name: full }),
    });
    setSearching(false);
    if (r.status === 401) {
      setNeedsLogin(true);
      setMatches(null);
      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ pin, name: full }));
      } catch {
        // Storage unavailable: the user will retype after logging in.
      }
      return;
    }
    if (r.error) setError(r.error);
    setMatches(r.data ?? null);
  }

  const showList = open && suggestions.length > 0;

  return (
    <section className="mt-12" aria-labelledby="name-title">
      <h2 id="name-title" className="font-display text-2xl font-medium text-ink">
        Is your family’s name here?
      </h2>
      <p className="mt-2 text-ink-soft">
        Start typing the name. You will see how many records share that first name.
      </p>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void find();
        }}
      >
        <label htmlFor="person-name" className="block text-[0.95rem] font-semibold text-ink">
          Their full name
        </label>
        <div className="relative mt-2 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              id="person-name"
              role="combobox"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              autoComplete="off"
              value={name}
              placeholder="Mahendra Prasad Mehta"
              onChange={(e) => {
                setName(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              onKeyDown={(e) => {
                if (!showList) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, suggestions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter" && active >= 0) {
                  e.preventDefault();
                  choose(suggestions[active]!);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              className={inputClass}
            />
            {showList ? (
              <ul
                id={listId}
                role="listbox"
                className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-paper-edge bg-[#fdfaf2] shadow-[0_12px_24px_-12px_rgb(28_34_48/0.3)]"
              >
                {suggestions.map((s, i) => (
                  <li
                    key={s.name}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(s);
                    }}
                    className={`flex cursor-pointer items-baseline justify-between gap-4 px-4 py-3 ${i === active ? "bg-paper-deep" : "hover:bg-paper-deep/60"}`}
                  >
                    <span className="font-semibold text-ink">{s.name}</span>
                    <span className="text-sm text-ink-soft">
                      {s.records} {s.records === 1 ? "record" : "records"} in this PIN
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button type="submit" disabled={searching} className={buttonClass("primary", "shrink-0")}>
            {searching ? "Searching…" : "Find records"}
          </button>
        </div>
      </form>

      <div aria-live="polite" className="mt-6">
        <FormError message={error} />
        {needsLogin ? (
          <div className="rounded-md border border-paper-edge bg-[#fbf7ec] p-6">
            <p className="font-semibold text-ink">Log in to see the matching records</p>
            <p className="mt-1 text-ink-soft">
              Named records are shown only to signed-in families, so this tool cannot be used to
              sweep a village. It is free.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(`/search?pin=${pin}`)}`}
              className={buttonClass("primary", "mt-4")}
            >
              Log in and continue
            </Link>
          </div>
        ) : null}
        {matches ? <Results matches={matches} searchedName={searchedName.current} /> : null}
      </div>
    </section>
  );
}

function Results({ matches, searchedName }: { matches: RecordMatch[]; searchedName: string }) {
  if (matches.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-rule px-5 py-8 text-center text-ink-soft">
        No records under this name in this PIN. Try another spelling, initials (like M. P. Mehta),
        or another PIN where they lived.
      </p>
    );
  }
  return (
    <ul className="border-t-2 border-ink">
      {matches.map((m) => (
        <ResultRow key={m.id} match={m} searchedName={searchedName} />
      ))}
    </ul>
  );
}

function ResultRow({ match, searchedName }: { match: RecordMatch; searchedName: string }) {
  const [opened, setOpened] = useState(false);
  return (
    <li className="border-b border-rule py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-3 text-sm text-ink-faint">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${strengthTone[match.strength]}`}
            >
              {strengthLabel[match.strength]}
            </span>
            {kindLabel[match.kind] ?? "Unclaimed amount"}
          </p>
          <p className="mt-2 font-display text-xl font-medium text-ink">{match.nameOnRecord}</p>
          <p className="mt-1 text-ink-soft">
            {match.company}
            {match.financialYear ? `, ${match.financialYear} list` : ""}
            {match.area ? `. ${match.area}` : ""}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {match.fatherHint
              ? `Father or husband: ${match.fatherHint}`
              : "No father’s name on this record"}
          </p>
        </div>
        <div className="text-right">
          {match.amountPaise != null ? (
            <p className="font-display text-2xl text-ledger tabular-nums">
              {rupees(match.amountPaise)}
            </p>
          ) : null}
          {match.shares != null ? (
            <p className="text-sm text-ink-soft">{match.shares} shares</p>
          ) : null}
        </div>
      </div>
      {opened ? (
        <ConfirmPanel match={match} searchedName={searchedName} />
      ) : (
        <button
          type="button"
          onClick={() => setOpened(true)}
          className={buttonClass("primary", "mt-4 px-4 py-2.5 text-sm")}
        >
          This is our family
        </button>
      )}
    </li>
  );
}

function ConfirmPanel({ match, searchedName }: { match: RecordMatch; searchedName: string }) {
  const [father, setFather] = useState("");
  const [record, setRecord] = useState<ConfirmedRecord | null>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function confirm(e?: React.FormEvent) {
    e?.preventDefault();
    setPending(true);
    setError(undefined);
    const r = await getJson<ConfirmedRecord>("/api/records/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: match.id, name: searchedName, father }),
    });
    setPending(false);
    if (r.data) setRecord(r.data);
    else setError(r.error);
  }

  if (record) return <SavePanel record={record} searchedName={searchedName} father={father} />;

  return (
    <form onSubmit={confirm} className="mt-4 rounded-md border border-paper-edge bg-[#fbf7ec] p-5">
      <FormError message={error} />
      {match.fatherHint ? (
        <>
          <label htmlFor={`father-${match.id}`} className="block font-semibold text-ink">
            Father’s or husband’s name on their papers
          </label>
          <p className="mt-1 text-sm text-ink-faint">
            This keeps records private to the family. It should match {match.fatherHint}.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id={`father-${match.id}`}
              value={father}
              onChange={(e) => setFather(e.target.value)}
              required
              className={inputClass}
            />
            <button
              type="submit"
              disabled={pending || father.trim().length < 2}
              className={buttonClass("primary", "shrink-0")}
            >
              {pending ? "Checking…" : "Confirm"}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink-soft">
            This record has no father’s name, so it is matched on the full name.
          </p>
          <button type="submit" disabled={pending} className={buttonClass("primary", "shrink-0")}>
            {pending ? "Checking…" : "Show full details"}
          </button>
        </div>
      )}
    </form>
  );
}

function SavePanel({
  record,
  searchedName,
  father,
}: {
  record: ConfirmedRecord;
  searchedName: string;
  father: string;
}) {
  const [cases, setCases] = useState<{ id: string; fullName: string }[] | null>(null);
  const [caseId, setCaseId] = useState("new");
  const [relation, setRelation] = useState<(typeof relations)[number] | "">("");
  const [living, setLiving] = useState<"" | "yes" | "no">("");
  const [error, setError] = useState<string>();
  const [savedCase, setSavedCase] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void myCasesAction().then((c) => {
      setCases(c);
      if (c[0]) setCaseId(c[0].id);
    });
  }, []);

  async function save() {
    setPending(true);
    setError(undefined);
    const res = await saveRecordAction({
      recordId: record.id,
      name: searchedName,
      father,
      ...(caseId === "new"
        ? {
            relation: relation || undefined,
            isLiving: living === "" ? undefined : living === "yes",
          }
        : { caseId }),
    });
    setPending(false);
    if (res.ok && res.caseId) setSavedCase(res.caseId);
    else setError(res.error);
  }

  return (
    <div className="mt-4 rounded-md border border-ledger/40 bg-ledger-wash/40 p-5">
      <p className="font-semibold text-ledger">Confirmed</p>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-ink-faint">Folio or account</dt>
        <dd className="text-ink">{record.folio ?? "Not on record"}</dd>
        <dt className="text-ink-faint">Address on record</dt>
        <dd className="text-ink">{[record.address, record.pinCode].filter(Boolean).join(", ")}</dd>
        {record.fatherName ? (
          <>
            <dt className="text-ink-faint">Father or husband</dt>
            <dd className="text-ink">{record.fatherName}</dd>
          </>
        ) : null}
      </dl>

      {savedCase ? (
        <p className="mt-5">
          Saved as a lead.{" "}
          <Link
            href={`/cases/${savedCase}`}
            className="font-semibold text-royal underline underline-offset-4"
          >
            Open the case
          </Link>
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          <FormError message={error} />
          <label className="block text-sm font-semibold text-ink" htmlFor={`case-${record.id}`}>
            Save to
          </label>
          <select
            id={`case-${record.id}`}
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className={`${inputClass} sm:max-w-sm`}
            disabled={cases === null}
          >
            {(cases ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
            <option value="new">A new case for {searchedName}</option>
          </select>
          {caseId === "new" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                aria-label="How are they related to you?"
                value={relation}
                onChange={(e) => setRelation(e.target.value as typeof relation)}
                className={inputClass}
              >
                <option value="" disabled>
                  How are they related to you?
                </option>
                {relations.map((r) => (
                  <option key={r} value={r}>
                    {relationLabel[r]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Are they living?"
                value={living}
                onChange={(e) => setLiving(e.target.value as typeof living)}
                className={inputClass}
              >
                <option value="" disabled>
                  Are they living?
                </option>
                <option value="yes">Living</option>
                <option value="no">Passed away</option>
              </select>
            </div>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className={buttonClass("primary")}
          >
            {pending ? "Saving…" : "Save as a lead"}
          </button>
        </div>
      )}
    </div>
  );
}
