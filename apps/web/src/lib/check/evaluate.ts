import { getSource, type MoneySource, type SourceId } from "@/content/sources";
import type { Answers } from "./questions";

export type Priority = "first" | "also" | "skip";

export type SourceVerdict = {
  source: MoneySource;
  priority: Priority;
  reason: string;
};

export type CheckResult = {
  verdicts: SourceVerdict[];
  claimPath: { title: string; body: string };
  papersNote: string | null;
};

type Rule = (a: Answers) => { priority: Priority; reason: string };

const has = (a: Answers, h: NonNullable<Answers["holdings"]>[number]) =>
  a.holdings?.includes(h) ?? false;
const older = (a: Answers) => a.era === "before1995" || a.era === "1995to2010";
const unsureEra = (a: Answers) => a.era === "unsure" || a.era === undefined;

// Each rule explains itself, so the result never shows a priority without a reason.
const rules: Record<SourceId, Rule> = {
  bank: (a) => {
    if (has(a, "bank")) return { priority: "first", reason: "You know of a bank account or FD." };
    if (a.moved === "yes")
      return {
        priority: "first",
        reason: "Accounts left behind after a move are the most common unclaimed money.",
      };
    return {
      priority: "also",
      reason: "Almost everyone had a bank account at some point. It is a quick search.",
    };
  },
  shares: (a) => {
    if (has(a, "shares")) return { priority: "first", reason: "You know they held shares." };
    if (older(a) && (a.papers === "box" || a.papers === "few"))
      return {
        priority: "first",
        reason:
          "Many families bought shares in the 1980s and 90s, and old papers often reveal them.",
      };
    if (older(a) || unsureEra(a))
      return {
        priority: "also",
        reason: "Shares bought decades ago often went unclaimed when addresses changed.",
      };
    return {
      priority: "skip",
      reason: "Recent savings with no known shares make this less likely.",
    };
  },
  insurance: (a) => {
    if (has(a, "insurance"))
      return { priority: "first", reason: "You know of a life insurance policy." };
    if (a.work === "privateJob" || a.work === "governmentJob" || a.work === "business")
      return { priority: "also", reason: "Earning households very often bought an LIC policy." };
    return { priority: "also", reason: "Life insurance was common across most Indian families." };
  },
  mutualFunds: (a) => {
    if (has(a, "mutualFunds"))
      return { priority: "first", reason: "You know of mutual fund investments." };
    if (a.era === "1995to2010" || a.era === "after2010" || unsureEra(a))
      return {
        priority: "also",
        reason: "Mutual fund folios from this period are often forgotten.",
      };
    return {
      priority: "skip",
      reason: "Mutual funds were less common for savings made before 1995.",
    };
  },
  providentFund: (a) => {
    if (a.work === "privateJob")
      return {
        priority: "first",
        reason:
          "Salaried private jobs usually come with an EPF account, and old ones are easy to leave behind.",
      };
    if (a.work === "governmentJob")
      return {
        priority: "also",
        reason:
          "Government jobs often use GPF rather than EPF, but earlier private jobs may have left an EPF account.",
      };
    if (a.work === "unsure")
      return { priority: "also", reason: "Worth checking if they ever held a salaried job." };
    return {
      priority: "skip",
      reason: "Provident fund comes from salaried jobs, which does not seem to apply.",
    };
  },
  postOffice: (a) => {
    if (has(a, "postOffice"))
      return { priority: "first", reason: "You know of post office savings." };
    if (older(a) || a.work === "farming" || a.work === "homemaker" || a.work === "governmentJob")
      return {
        priority: "also",
        reason: "NSC, KVP and post office savings were a common choice for families like theirs.",
      };
    return {
      priority: "skip",
      reason: "Less likely, but a branch visit settles it if papers turn up.",
    };
  },
};

const order: Record<Priority, number> = { first: 0, also: 1, skip: 2 };

export function evaluate(answers: Answers): CheckResult {
  const verdicts = (Object.keys(rules) as SourceId[])
    .map((id) => ({ source: getSource(id), ...rules[id](answers) }))
    .sort((x, y) => order[x.priority] - order[y.priority]);

  return { verdicts, claimPath: claimPath(answers), papersNote: papersNote(answers) };
}

function claimPath(a: Answers): CheckResult["claimPath"] {
  if (a.person === "self" || a.living === "yes") {
    return {
      title: "The simplest case: a direct claim",
      body: "The account holder can claim with their own KYC and a claim form. No heirship papers are needed.",
    };
  }
  if (a.nominee === "yes") {
    return {
      title: "A nominee claim",
      body: "Institutions usually ask the nominee for the death certificate, their own KYC and a claim form. This is the faster route.",
    };
  }
  return {
    title: "A legal heir claim",
    body: "Without a known nominee, institutions usually ask for proof of heirship: a legal heir certificate, a will, or for larger amounts a succession certificate from a court. Start on this early. It is the slowest part.",
  };
}

function papersNote(a: Answers): string | null {
  if (a.papers === "box" || a.papers === "few") {
    return "Start with the papers. One dividend letter or premium receipt can name the company and the account number, which makes every search faster.";
  }
  if (a.papers === "unsure") {
    return "Before searching, look through trunks, almirahs and old files. A single letter from a company can name exactly where the money is.";
  }
  return null;
}
