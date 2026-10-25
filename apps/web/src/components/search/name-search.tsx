"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { myCasesAction, saveRecordAction } from "@/app/(app)/cases/actions";
import { buttonClass } from "@/components/ui/button";
import { FormError, inputClass } from "@/components/ui/field";
import { relationLabel } from "@/lib/labels";
import { relations } from "@/lib/validation/case";
import type { ConfirmedRecord, FirstNameSuggestion, RecordMatch } from "@/server/records-search";
import { getJson, rupees } from "./shared";

const PENDING_KEY = "lp.pendingSearch";

const strengthLabel: Record<RecordMatch["strength"], string> = {
  exact: "Same name",
  strong: "Very likely",
  possible: "Possible, initials only",
};

const strengthTone: Record<RecordMatch["strength"], string> = {
  exact: "border-ledger/40 bg-ledger-wash/70 text-ledger",
  strong: "border-royal/40 bg-royal/[0.04] text-royal",
  possible: "border-ink/15 text-ink-soft",
};

const kindLabel: Record<string, string> = {
  unclaimed_dividend: "Unclaimed dividend",
  shares_transferred_to_iepf: "Shares moved to IEPF",
  other: "Unclaimed amount",
};

export function NameSearch({ pin }: { pin: string }) {
  const [name, setName] = useState("");
  const [fetched, setFetched] = useState<{ q: string; list: FirstNameSuggestion[] }>({
    q: "",
    list: [],
  });
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

  // Suggestions follow the first word only.
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
    }, 200);
    return () => clearTimeout(t);
  }, [firstWord, wantSuggestions, pin]);

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

  return (
    <section aria-labelledby="name-title">
      <h2
        id="name-title"
        className="font-display text-[1.65rem] leading-tight font-medium text-ink"
      >
        Look for a family member
      </h2>
      <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">
        Type the name as it would appear on old share papers. Matching first names in this PIN show
        up as you type.
      </p>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void find();
        }}
      >
        <label htmlFor="person-name" className="sr-only">
          Full name
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            ref={inputRef}
            id="person-name"
            autoComplete="off"
            value={name}
            placeholder="For example, Mahendra Prasad Mehta"
            onChange={(e) => setName(e.target.value)}
            className={`${inputClass} h-13 text-[1.05rem]`}
            aria-describedby="name-suggestions"
          />
          <button
            type="submit"
            disabled={searching}
            className={buttonClass("primary", "h-13 shrink-0 px-6")}
          >
            {searching ? "Searching…" : "Find records"}
          </button>
        </div>

        <div id="name-suggestions" aria-live="polite" className="mt-3 min-h-9">
          {suggestions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm text-ink-faint">In this PIN:</span>
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => {
                    setName(`${s.name} `);
                    inputRef.current?.focus();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-[#fdfaf2] py-1.5 pr-1.5 pl-3.5 text-sm text-ink transition-colors hover:border-royal hover:text-royal"
                >
                  {s.name}
                  <span className="rounded-full bg-paper-deep px-2 py-0.5 text-xs text-ink-soft tabular-nums">
                    {s.records}
                  </span>
                </button>
              ))}
            </div>
          ) : wantSuggestions && fetched.q === firstWord ? (
            <p className="text-sm text-ink-faint">
              No first names starting with “{firstWord}” in this PIN.
            </p>
          ) : null}
        </div>
      </form>

      <div aria-live="polite" className="mt-4">
        <FormError message={error} />
        {needsLogin ? (
          <div className="rounded-xl border border-paper-edge bg-[#fbf7ec] p-6 sm:p-7">
            <p className="font-display text-xl font-medium text-ink">
              Log in to see the matching records
            </p>
            <p className="mt-2 max-w-lg leading-relaxed text-ink-soft">
              Named records are shown only to signed-in families, so nobody can use this to list a
              village. It is free and takes a minute.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(`/search?pin=${pin}`)}`}
              className={buttonClass("primary", "mt-5")}
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
      <div className="rounded-xl border border-dashed border-rule px-6 py-10 text-center">
        <p className="font-semibold text-ink">No records under this name here</p>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">
          Try another spelling, initials such as M. P. Mehta, or a nearby PIN where they lived.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-3 text-sm text-ink-faint">
        {matches.length} {matches.length === 1 ? "record" : "records"} for “{searchedName}”
      </p>
      <ul className="space-y-3">
        {matches.map((m) => (
          <ResultCard key={m.id} match={m} searchedName={searchedName} />
        ))}
      </ul>
    </div>
  );
}

function ResultCard({ match, searchedName }: { match: RecordMatch; searchedName: string }) {
  const [opened, setOpened] = useState(false);
  return (
    <li className="rounded-xl border border-paper-edge bg-[#fdfaf2] p-5 transition-shadow hover:shadow-[0_12px_28px_-24px_rgb(28_34_48/0.5)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <span
            className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${strengthTone[match.strength]}`}
          >
            {strengthLabel[match.strength]}
          </span>
          <p className="mt-3 font-display text-xl leading-snug font-medium text-ink">
            {match.nameOnRecord}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {match.fatherHint
              ? `Father or husband ${match.fatherHint}`
              : "No father’s name on record"}
          </p>
        </div>
        <div className="text-right">
          {match.amountPaise != null ? (
            <p className="font-display text-2xl leading-none text-ledger tabular-nums">
              {rupees(match.amountPaise)}
            </p>
          ) : null}
          {match.shares != null ? (
            <p className="mt-1 text-sm text-ink-soft">{match.shares} shares</p>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-1 border-t border-paper-edge pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-faint">Company</dt>
          <dd className="text-ink">{match.company}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Type</dt>
          <dd className="text-ink">{kindLabel[match.kind] ?? "Unclaimed amount"}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">List</dt>
          <dd className="text-ink">{match.financialYear ?? "Not dated"}</dd>
        </div>
      </dl>

      {opened ? (
        <ConfirmPanel match={match} searchedName={searchedName} />
      ) : (
        <button
          type="button"
          onClick={() => setOpened(true)}
          className="mt-5 inline-flex items-center rounded-md border border-royal/50 px-4 py-2 text-sm font-semibold text-royal transition-colors hover:bg-royal hover:text-paper"
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
    <form onSubmit={confirm} className="mt-5 rounded-lg bg-paper-deep/60 p-5">
      <FormError message={error} />
      {match.fatherHint ? (
        <>
          <label htmlFor={`father-${match.id}`} className="block font-semibold text-ink">
            Father’s or husband’s name on their papers
          </label>
          <p className="mt-1 text-sm text-ink-faint">
            Only family would know this. It should match {match.fatherHint}.
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
    <div className="mt-5 rounded-lg border border-ledger/30 bg-ledger-wash/40 p-5">
      <p className="text-sm font-semibold text-ledger">
        Confirmed. These are the details on record.
      </p>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">
        <dt className="text-ink-faint">Folio or account</dt>
        <dd className="font-semibold text-ink tabular-nums">{record.folio ?? "Not on record"}</dd>
        <dt className="text-ink-faint">Address</dt>
        <dd className="text-ink">{[record.address, record.pinCode].filter(Boolean).join(", ")}</dd>
        {record.fatherName ? (
          <>
            <dt className="text-ink-faint">Father or husband</dt>
            <dd className="text-ink">{record.fatherName}</dd>
          </>
        ) : null}
      </dl>

      {savedCase ? (
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <p className="text-ink">Saved to your case as a found lead.</p>
          <Link
            href={`/cases/${savedCase}`}
            className={buttonClass("primary", "px-4 py-2 text-sm")}
          >
            Open the case
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-3 border-t border-ledger/20 pt-5">
          <FormError message={error} />
          <label className="block text-sm font-semibold text-ink" htmlFor={`case-${record.id}`}>
            Save it to
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              id={`case-${record.id}`}
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className={inputClass}
              disabled={cases === null}
            >
              {(cases ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
              <option value="new">A new case for {searchedName}</option>
            </select>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className={buttonClass("primary")}
            >
              {pending ? "Saving…" : "Save as a lead"}
            </button>
          </div>
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
        </div>
      )}
    </div>
  );
}
