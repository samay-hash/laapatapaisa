// Generates the spellings an old Indian record might use for one name:
// initials, common abbreviations (Ch., Pd., Kr.), surname-first order and
// common transliteration differences. Pure and deterministic.

const HONORIFICS = new Set([
  "late",
  "shri",
  "sri",
  "shree",
  "smt",
  "srimati",
  "shrimati",
  "km",
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
]);

// Words that office clerks routinely shortened.
const ABBREVIATIONS: Record<string, string[]> = {
  chandra: ["Ch."],
  chander: ["Ch."],
  prasad: ["Pd.", "Prd."],
  kumar: ["Kr."],
  kumari: ["Kri."],
  mohammad: ["Md.", "Mohd."],
  mohammed: ["Md.", "Mohd."],
  muhammad: ["Md.", "Mohd."],
  narayan: ["Nar."],
  lal: ["L."],
};

// Spellings of the same name that appear interchangeably in records.
const SPELLING_GROUPS: string[][] = [
  ["Chandra", "Chander", "Chandar"],
  ["Prasad", "Prashad", "Parshad"],
  ["Lakshmi", "Laxmi", "Lakshmy"],
  ["Mohammad", "Mohammed", "Muhammad"],
  ["Srivastava", "Shrivastava", "Srivastav", "Shrivastav"],
  ["Agarwal", "Agrawal", "Aggarwal"],
  ["Chaudhary", "Choudhary", "Chaudhari", "Choudhury"],
  ["Devi", "Debi"],
  ["Narayan", "Narain", "Narayana"],
  ["Venkatesh", "Venkatesan"],
  ["Gupta", "Gupt"],
  ["Mishra", "Misra"],
  ["Tripathi", "Tripathy"],
  ["Pandey", "Pande", "Pandeya"],
  ["Rao", "Row"],
  ["Iyer", "Aiyar", "Iyar"],
];

const spellingIndex = new Map<string, string[]>();
for (const group of SPELLING_GROUPS) {
  for (const word of group) spellingIndex.set(word.toLowerCase(), group);
}

export const MAX_VARIANTS = 16;

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Splits a name into clean words, dropping honorifics and punctuation. */
export function nameParts(fullName: string): string[] {
  return fullName
    .replace(/[.,]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !HONORIFICS.has(w.toLowerCase()))
    .map(titleCase);
}

export function generateNameVariants(fullName: string): string[] {
  const parts = nameParts(fullName);
  if (parts.length === 0) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  const add = (v: string) => {
    const clean = v.replace(/\s+/g, " ").trim();
    const key = clean.toLowerCase();
    if (clean && !seen.has(key) && out.length < MAX_VARIANTS) {
      seen.add(key);
      out.push(clean);
    }
  };

  const full = parts.join(" ");
  add(full);
  if (parts.length === 1) {
    for (const alt of spellingIndex.get(parts[0]!.toLowerCase()) ?? []) add(alt);
    return out;
  }

  const last = parts[parts.length - 1]!;
  const given = parts.slice(0, -1);
  const first = given[0]!;
  const middle = given.slice(1);
  const initials = given.map((w) => w.charAt(0));

  // Initials, in the three ways clerks wrote them.
  add(`${initials.map((i) => `${i}.`).join(" ")} ${last}`);
  add(`${initials.join(" ")} ${last}`);
  add(`${initials.join("")} ${last}`);

  // Without the middle name, and with the middle name as an initial.
  if (middle.length > 0) {
    add(`${first} ${last}`);
    add(`${first} ${middle.map((m) => `${m.charAt(0)}.`).join(" ")} ${last}`);
  }

  // Common abbreviations of any given name.
  given.forEach((word, i) => {
    for (const abbr of ABBREVIATIONS[word.toLowerCase()] ?? []) {
      const replaced = [...given];
      replaced[i] = abbr;
      add(`${replaced.join(" ")} ${last}`);
    }
  });

  // Surname first, as in many bank and company registers.
  add(`${last} ${given.join(" ")}`);
  add(`${last} ${initials.join(" ")}`);

  // Alternative spellings, one word at a time.
  parts.forEach((word, i) => {
    for (const alt of spellingIndex.get(word.toLowerCase()) ?? []) {
      if (alt.toLowerCase() === word.toLowerCase()) continue;
      const replaced = [...parts];
      replaced[i] = alt;
      add(replaced.join(" "));
    }
  });

  return out;
}
