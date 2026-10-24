// Questions for the free check. Answers never leave the browser.

export type Answers = {
  person?: "parent" | "grandparent" | "spouse" | "relative" | "self";
  living?: "yes" | "no";
  era?: "before1995" | "1995to2010" | "after2010" | "unsure";
  work?: "privateJob" | "governmentJob" | "business" | "farming" | "homemaker" | "unsure";
  holdings?: Holding[];
  papers?: "box" | "few" | "none" | "unsure";
  moved?: "yes" | "no" | "unsure";
  nominee?: "yes" | "no" | "unsure";
};

export type Holding = "bank" | "shares" | "insurance" | "mutualFunds" | "postOffice" | "none";

type Option<V extends string> = { value: V; label: string; hint?: string };

type SingleQuestion<K extends keyof Answers> = {
  id: K;
  kind: "single";
  title: string;
  help?: string;
  options: Option<NonNullable<Answers[K]> & string>[];
  showIf?: (a: Answers) => boolean;
};

type MultiQuestion = {
  id: "holdings";
  kind: "multi";
  title: string;
  help?: string;
  options: Option<Holding>[];
  showIf?: (a: Answers) => boolean;
};

export type Question =
  | SingleQuestion<"person">
  | SingleQuestion<"living">
  | SingleQuestion<"era">
  | SingleQuestion<"work">
  | SingleQuestion<"papers">
  | SingleQuestion<"moved">
  | SingleQuestion<"nominee">
  | MultiQuestion;

export const questions: readonly Question[] = [
  {
    id: "person",
    kind: "single",
    title: "Who are you checking for?",
    options: [
      { value: "parent", label: "A parent" },
      { value: "grandparent", label: "A grandparent" },
      { value: "spouse", label: "My spouse" },
      { value: "relative", label: "Another relative" },
      { value: "self", label: "Myself" },
    ],
  },
  {
    id: "living",
    kind: "single",
    title: "Are they living?",
    help: "This changes who can make the claim and what papers are needed.",
    showIf: (a) => a.person !== "self",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "They have passed away" },
    ],
  },
  {
    id: "era",
    kind: "single",
    title: "When did most of the saving happen?",
    help: "Older money is more likely to have gone quiet.",
    options: [
      { value: "before1995", label: "Before 1995" },
      { value: "1995to2010", label: "1995 to 2010" },
      { value: "after2010", label: "After 2010" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  {
    id: "work",
    kind: "single",
    title: "What was the main source of income?",
    options: [
      { value: "privateJob", label: "Salaried job, private company" },
      { value: "governmentJob", label: "Government or PSU job" },
      { value: "business", label: "Own business or shop" },
      { value: "farming", label: "Farming" },
      { value: "homemaker", label: "Homemaker" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  {
    id: "holdings",
    kind: "multi",
    title: "Which of these do you know about?",
    help: "Pick anything that rings a bell, even vaguely.",
    options: [
      { value: "bank", label: "Bank account or FD" },
      { value: "shares", label: "Shares" },
      { value: "insurance", label: "LIC or other life insurance" },
      { value: "mutualFunds", label: "Mutual funds" },
      { value: "postOffice", label: "Post office NSC, KVP or savings" },
      { value: "none", label: "None that I know of" },
    ],
  },
  {
    id: "papers",
    kind: "single",
    title: "Are there old papers at home?",
    help: "Passbooks, certificates, letters from companies, receipts.",
    options: [
      { value: "box", label: "Yes, a box or file of them" },
      { value: "few", label: "A few" },
      { value: "none", label: "No" },
      { value: "unsure", label: "Not sure, need to look" },
    ],
  },
  {
    id: "moved",
    kind: "single",
    title: "Were there moves to other cities, or a change of bank, over the years?",
    help: "Accounts left behind in an old city are a common source.",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  {
    id: "nominee",
    kind: "single",
    title: "Did they name a nominee on their accounts?",
    showIf: (a) => a.person !== "self" && a.living === "no",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unsure", label: "Not sure" },
    ],
  },
];

export function visibleQuestions(answers: Answers): Question[] {
  return questions.filter((q) => !q.showIf || q.showIf(answers));
}

export function isAnswered(q: Question, answers: Answers): boolean {
  if (q.kind === "multi") return (answers.holdings?.length ?? 0) > 0;
  return answers[q.id] !== undefined;
}
