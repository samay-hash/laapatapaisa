import { sources } from "@/content/sources";
import type { leadSources, leadStatuses, relations } from "@/lib/validation/case";

export const relationLabel: Record<(typeof relations)[number], string> = {
  parent: "Parent",
  grandparent: "Grandparent",
  spouse: "Spouse",
  relative: "Relative",
  self: "Myself",
};

export const statusLabel: Record<(typeof leadStatuses)[number], string> = {
  clue: "Clue",
  searching: "Searching",
  found: "Found",
  claimFiled: "Claim filed",
  paid: "Paid",
  deadEnd: "Dead end",
};

export const sourceLabel: Record<(typeof leadSources)[number], string> = {
  ...(Object.fromEntries(sources.map((s) => [s.id, s.name])) as Record<
    Exclude<(typeof leadSources)[number], "other">,
    string
  >),
  other: "Other",
};

const rupees = new Intl.NumberFormat("en-IN");

/** Formats whole rupees with Indian digit grouping, e.g. ₹2,46,300. */
export function formatRupees(amount: number): string {
  return `₹${rupees.format(amount)}`;
}
