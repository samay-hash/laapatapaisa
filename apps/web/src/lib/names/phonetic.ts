// Phonetic keys for Indian names written in English. Old registers spell the
// same name many ways (Mahendra, Mahender, Mohindra; Prasad, Prashad, Pd.), so
// matching uses keys that ignore those differences. Pure and deterministic.

const HONORIFICS = new Set([
  "late",
  "lt",
  "shri",
  "sri",
  "shree",
  "smt",
  "srimati",
  "shrimati",
  "km",
  "kum",
  "mr",
  "mrs",
  "ms",
  "miss",
  "dr",
  "prof",
  "md",
]);

// Clerical abbreviations, expanded before keying.
const ABBREVIATIONS: Record<string, string> = {
  ch: "chandra",
  chd: "chandra",
  pd: "prasad",
  prd: "prasad",
  kr: "kumar",
  kum: "kumar",
  mohd: "mohammad",
  nr: "narayan",
};

// Applied in order. Each rule folds spellings that sound alike.
const FOLDS: [RegExp, string][] = [
  [/ph/g, "f"],
  [/(?<=[bcdgjkpt])h/g, ""], // aspirates: bh, ch, dh, gh, jh, kh, ph, th -> plain
  [/sh/g, "s"],
  [/ow(?![aeiou])/g, "o"], // Chowdhary ~ Chodhary, before w -> v
  [/w/g, "v"],
  [/z/g, "j"],
  [/q/g, "k"],
  [/x/g, "ks"],
  [/ck/g, "k"],
  [/ee|ii|ie/g, "i"],
  [/oo|uu/g, "u"],
  [/ou/g, "o"], // Choudhary ~ Chaudhary
  [/aa/g, "a"],
  [/ai|ay|ei|ey/g, "e"],
  [/au/g, "o"],
  [/y/g, "i"],
  [/(.)\1+/g, "$1"], // double letters
  [/(?<=\w{2})er$/g, "r"], // Mahender -> Mahendr, Inder -> Indr
  [/(?<=\w{2})ar$/g, "r"], // Chandar -> Chandr
  [/(?<=\w{3})an$/g, "n"], // Krishan -> Krishn
  [/(?<=\w{3})a$/g, ""], // Krishna -> Krishn, Mehta -> Meht
];

/** Lowercases, strips accents and punctuation, removes honorifics, expands abbreviations. */
export function nameTokens(name: string): string[] {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !HONORIFICS.has(t))
    .map((t) => ABBREVIATIONS[t] ?? t);
}

/** The sound-alike key for one name word. */
export function phoneticKey(token: string): string {
  let key = token.toLowerCase().replace(/[^a-z]/g, "");
  if (key.length <= 1) return key;
  for (const [pattern, replacement] of FOLDS) key = key.replace(pattern, replacement);
  return key;
}

export type NameKeys = {
  /** Key of the first word, or "" when the name is only initials. */
  first: string;
  /** Key of the last word (usually the surname). */
  last: string;
  /** First letter of every word except the last. */
  initials: string;
  /** Keys of every word, in order. */
  all: string[];
};

export function nameKeys(name: string): NameKeys {
  const tokens = nameTokens(name);
  const all = tokens.map(phoneticKey);
  if (tokens.length === 0) return { first: "", last: "", initials: "", all };
  const firstToken = tokens[0]!;
  return {
    first: firstToken.length > 1 ? all[0]! : "",
    last: tokens.length > 1 ? all.at(-1)! : "",
    initials: tokens
      .slice(0, Math.max(1, tokens.length - 1))
      .map((t) => t.charAt(0))
      .join(""),
    all,
  };
}

export type MatchStrength = "exact" | "strong" | "possible" | "none";

/**
 * How well a searched name matches a recorded one.
 * exact:    every word sounds the same
 * strong:   first and last names sound the same (middle name may differ or be missing)
 * possible: surname matches and the first initial matches (e.g. "M. P. Mehta")
 */
export function matchStrength(searched: string, recorded: string): MatchStrength {
  const a = nameKeys(searched);
  const b = nameKeys(recorded);
  if (a.all.length === 0 || b.all.length === 0) return "none";
  if (a.all.length === b.all.length && a.all.every((k, i) => k === b.all[i])) return "exact";
  if (!a.last || !b.last || a.last !== b.last) return "none";
  if (a.first && b.first && a.first === b.first) return "strong";
  if (a.initials.charAt(0) && a.initials.charAt(0) === b.initials.charAt(0)) {
    // One side wrote initials only, or the first names differ in a way folds miss.
    if (!a.first || !b.first) return "possible";
  }
  return "none";
}
