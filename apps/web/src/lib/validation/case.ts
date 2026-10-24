import { z } from "zod";

const currentYear = new Date().getFullYear();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const optionalYear = z
  .union([z.literal(""), z.coerce.number().int().min(1900).max(currentYear)])
  .optional()
  .transform((v) => (typeof v === "number" ? v : null));

export const relations = ["parent", "grandparent", "spouse", "relative", "self"] as const;

export const createCaseSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter their full name").max(120),
    relation: z.enum(relations, "Choose how they are related to you"),
    isLiving: z
      .enum(["yes", "no"], "Tell us whether they are living")
      .transform((v) => v === "yes"),
    birthYear: optionalYear,
    deathYear: optionalYear,
    cities: z
      .string()
      .max(300)
      .optional()
      .transform((v) =>
        (v ?? "")
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, 10),
      ),
    occupation: optionalText(120),
  })
  .refine((c) => c.isLiving || c.relation !== "self", {
    path: ["isLiving"],
    message: "Choose 'Yes' when the case is for yourself",
  })
  .refine((c) => !c.birthYear || !c.deathYear || c.deathYear >= c.birthYear, {
    path: ["deathYear"],
    message: "Year of death must be after year of birth",
  });

export type CreateCaseInput = z.infer<typeof createCaseSchema>;

export const leadSources = [
  "bank",
  "shares",
  "insurance",
  "mutualFunds",
  "providentFund",
  "postOffice",
  "other",
] as const;

export const leadStatuses = [
  "clue",
  "searching",
  "found",
  "claimFiled",
  "paid",
  "deadEnd",
] as const;

export const createLeadSchema = z.object({
  source: z.enum(leadSources, "Choose where this money sits"),
  title: z.string().trim().min(2, "Describe what you found").max(160),
  institution: optionalText(120),
  reference: optionalText(80),
  amountRupees: z
    .preprocess(
      (v) => (typeof v === "string" ? v.replace(/[₹,\s]/g, "").replace(/\.0+$/, "") : v),
      z.union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000_000_000)]),
    )
    .optional()
    .transform((v) => (typeof v === "number" ? v : null)),
  status: z.enum(leadStatuses).default("clue"),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const variantSchema = z.string().trim().min(2, "Enter a spelling").max(120);
