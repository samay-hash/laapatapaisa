"use client";

import Link from "next/link";
import { useState, type RefObject } from "react";
import { buttonClass } from "@/components/ui/button";
import type { CheckResult, Priority } from "@/lib/check/evaluate";

const groups: { priority: Priority; title: string }[] = [
  { priority: "first", title: "Search these first" },
  { priority: "also", title: "Also worth a look" },
  { priority: "skip", title: "Probably not, but keep in mind" },
];

export function CheckResults({
  result,
  headingRef,
  onRestart,
}: {
  result: CheckResult;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onRestart: () => void;
}) {
  const worthChecking = result.verdicts.filter((v) => v.priority !== "skip").length;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-3xl leading-tight font-medium tracking-[-0.015em] text-ink outline-none sm:text-[2.6rem]"
      >
        {worthChecking} of 6 places are worth searching.
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
        Here is where to start, and why. Each link goes to the official portal that holds the money.
      </p>

      {result.papersNote ? (
        <p className="mt-8 border-l-2 border-stamp/60 pl-5 leading-relaxed text-ink">
          {result.papersNote}
        </p>
      ) : null}

      {groups.map(({ priority, title }) => {
        const items = result.verdicts.filter((v) => v.priority === priority);
        if (items.length === 0) return null;
        return (
          <section key={priority} className="mt-12">
            <h2 className="border-b-2 border-ink pb-3 text-sm font-semibold text-ink">{title}</h2>
            <ul>
              {items.map(({ source, reason }) => (
                <li
                  key={source.id}
                  className="grid gap-3 border-b border-rule py-6 sm:grid-cols-[1fr_auto] sm:gap-8"
                >
                  <div>
                    <h3
                      className={`font-display text-xl font-medium ${priority === "skip" ? "text-ink-soft" : "text-ink"}`}
                    >
                      {source.name}
                    </h3>
                    <p className="mt-1.5 leading-relaxed text-ink-soft">{reason}</p>
                    {priority !== "skip" ? (
                      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                        <span className="text-ink">How to search:</span> {source.howToSearch}
                      </p>
                    ) : null}
                  </div>
                  {priority !== "skip" ? (
                    <a
                      href={source.officialLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-start text-sm font-semibold whitespace-nowrap text-royal underline decoration-royal/30 underline-offset-4 hover:decoration-royal"
                    >
                      {source.officialLink.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="mt-12 rounded-md border border-paper-edge bg-paper-deep/70 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-medium text-ink">{result.claimPath.title}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{result.claimPath.body}</p>
      </section>

      <section className="mt-12 border-t-2 border-ink pt-8">
        <h2 className="font-display text-2xl font-medium text-ink">Keep track as you search</h2>
        <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">
          Create a free case to get the spellings to search for, and a place to record every clue,
          search and claim.
        </p>
        <Link href="/cases/new" className={buttonClass("primary", "mt-6")}>
          Create a free case
        </Link>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
        <ShareButton />
        <button type="button" onClick={onRestart} className={buttonClass("quiet")}>
          Check another person
        </button>
      </div>
    </div>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function share() {
    // Share only the public page link. Answers are never put in the URL.
    const url = `${window.location.origin}/check`;
    const text = "A free 2-minute check to see where your family's forgotten money might be.";
    if (navigator.share) {
      try {
        await navigator.share({ title: "LaapataPaisa free check", text, url });
      } catch {
        // The person closed the share sheet; nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button type="button" onClick={share} className={buttonClass("quiet")}>
      {copied ? "Link copied" : "Send this check to family"}
    </button>
  );
}
