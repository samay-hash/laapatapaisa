"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { evaluate } from "@/lib/check/evaluate";
import {
  isAnswered,
  visibleQuestions,
  type Answers,
  type Holding,
  type Question,
} from "@/lib/check/questions";
import { CheckResults } from "./check-results";

export function CheckWizard() {
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const steps = useMemo(() => visibleQuestions(answers), [answers]);
  const current = steps[Math.min(index, steps.length - 1)];

  // Move focus to the new question so keyboard and screen reader users follow along.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [index, done]);

  if (done) {
    return (
      <CheckResults
        result={evaluate(answers)}
        headingRef={headingRef}
        onRestart={() => {
          setAnswers({});
          setIndex(0);
          setDone(false);
        }}
      />
    );
  }

  if (!current) return null;

  const isLast = index >= steps.length - 1;
  const canContinue = isAnswered(current, answers);

  function next() {
    if (!canContinue) return;
    if (isLast) setDone(true);
    else setIndex((i) => i + 1);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      className="mx-auto w-full max-w-2xl"
    >
      <div className="flex items-center justify-between text-sm text-ink-faint">
        <span>
          Question {index + 1} of {steps.length}
        </span>
        <span>Your answers stay on this device</span>
      </div>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-paper-edge"
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={index}
      >
        <div
          className="h-full rounded-full bg-royal transition-[width] duration-300"
          style={{ width: `${(index / steps.length) * 100}%` }}
        />
      </div>

      <fieldset className="mt-10">
        <legend className="contents">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-3xl leading-tight font-medium tracking-[-0.015em] text-ink outline-none sm:text-4xl"
          >
            {current.title}
          </h1>
        </legend>
        {current.help ? <p className="mt-3 text-ink-soft">{current.help}</p> : null}

        <div className="mt-8 grid gap-3">
          {current.kind === "multi" ? (
            <MultiOptions question={current} answers={answers} setAnswers={setAnswers} />
          ) : (
            current.options.map((option) => {
              const checked = answers[current.id] === option.value;
              return (
                <label key={option.value} className={optionClass(checked)}>
                  <input
                    type="radio"
                    name={current.id}
                    value={option.value}
                    checked={checked}
                    onChange={() => setAnswers((a) => ({ ...a, [current.id]: option.value }))}
                    className="size-4 accent-royal"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })
          )}
        </div>
      </fieldset>

      <div className="mt-10 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className={buttonClass("quiet", "disabled:invisible")}
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!canContinue}
          className={buttonClass("primary", "min-w-36")}
        >
          {isLast ? "See where to look" : "Continue"}
        </button>
      </div>
    </form>
  );
}

function optionClass(checked: boolean): string {
  return `flex cursor-pointer items-center gap-4 rounded-md border px-5 py-4 text-[1.02rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-royal ${
    checked
      ? "border-royal bg-[#fdfaf2] text-ink ring-1 ring-royal"
      : "border-paper-edge bg-[#fbf7ec] text-ink hover:border-ink-faint"
  }`;
}

function MultiOptions({
  question,
  answers,
  setAnswers,
}: {
  question: Extract<Question, { kind: "multi" }>;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) {
  const selected = answers.holdings ?? [];

  function toggle(value: Holding) {
    setAnswers((a) => {
      const prev = a.holdings ?? [];
      // "None" is exclusive with every other choice.
      if (value === "none") return { ...a, holdings: prev.includes("none") ? [] : ["none"] };
      const without = prev.filter((h) => h !== "none" && h !== value);
      return { ...a, holdings: prev.includes(value) ? without : [...without, value] };
    });
  }

  return question.options.map((option) => {
    const checked = selected.includes(option.value);
    return (
      <label key={option.value} className={optionClass(checked)}>
        <input
          type="checkbox"
          name={question.id}
          value={option.value}
          checked={checked}
          onChange={() => toggle(option.value)}
          className="size-4 accent-royal"
        />
        <span>{option.label}</span>
      </label>
    );
  });
}
