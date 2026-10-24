import { describe, expect, it } from "vitest";
import { sources } from "@/content/sources";
import { evaluate } from "./evaluate";
import { isAnswered, questions, visibleQuestions, type Answers } from "./questions";

const priorityOf = (answers: Answers, id: string) =>
  evaluate(answers).verdicts.find((v) => v.source.id === id)?.priority;

describe("evaluate", () => {
  it("returns a verdict with a reason for every source", () => {
    const { verdicts } = evaluate({});
    expect(verdicts.map((v) => v.source.id).sort()).toEqual(sources.map((s) => s.id).sort());
    for (const v of verdicts) expect(v.reason.length).toBeGreaterThan(0);
  });

  it("orders verdicts: first, then also, then skip", () => {
    const rank = { first: 0, also: 1, skip: 2 } as const;
    const { verdicts } = evaluate({ era: "after2010", work: "farming", holdings: ["bank"] });
    const ranks = verdicts.map((v) => rank[v.priority]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("puts anything the family already knows about first", () => {
    const answers: Answers = {
      holdings: ["shares", "insurance", "mutualFunds", "postOffice", "bank"],
    };
    for (const id of ["shares", "insurance", "mutualFunds", "postOffice", "bank"]) {
      expect(priorityOf(answers, id)).toBe("first");
    }
  });

  it("treats a private salaried job as a strong PF lead and farming as unlikely", () => {
    expect(priorityOf({ work: "privateJob" }, "providentFund")).toBe("first");
    expect(priorityOf({ work: "farming" }, "providentFund")).toBe("skip");
  });

  it("raises shares when the money is old and papers exist", () => {
    expect(priorityOf({ era: "before1995", papers: "box" }, "shares")).toBe("first");
    expect(priorityOf({ era: "after2010", papers: "none" }, "shares")).toBe("skip");
  });

  it("chooses the claim path from living status and nominee", () => {
    expect(evaluate({ person: "self" }).claimPath.title).toMatch(/direct claim/);
    expect(evaluate({ person: "parent", living: "yes" }).claimPath.title).toMatch(/direct claim/);
    expect(evaluate({ person: "parent", living: "no", nominee: "yes" }).claimPath.title).toMatch(
      /nominee/,
    );
    expect(evaluate({ person: "parent", living: "no", nominee: "unsure" }).claimPath.title).toMatch(
      /legal heir/,
    );
  });

  it("only adds a papers note when papers may exist", () => {
    expect(evaluate({ papers: "box" }).papersNote).not.toBeNull();
    expect(evaluate({ papers: "unsure" }).papersNote).not.toBeNull();
    expect(evaluate({ papers: "none" }).papersNote).toBeNull();
  });
});

describe("questions", () => {
  it("skips the living and nominee questions when checking for yourself", () => {
    const ids = visibleQuestions({ person: "self" }).map((q) => q.id);
    expect(ids).not.toContain("living");
    expect(ids).not.toContain("nominee");
  });

  it("asks about a nominee only when the person has passed away", () => {
    expect(visibleQuestions({ person: "parent", living: "yes" }).map((q) => q.id)).not.toContain(
      "nominee",
    );
    expect(visibleQuestions({ person: "parent", living: "no" }).map((q) => q.id)).toContain(
      "nominee",
    );
  });

  it("requires at least one choice on the multi-select question", () => {
    const holdings = questions.find((q) => q.id === "holdings")!;
    expect(isAnswered(holdings, {})).toBe(false);
    expect(isAnswered(holdings, { holdings: [] })).toBe(false);
    expect(isAnswered(holdings, { holdings: ["none"] })).toBe(true);
  });
});
