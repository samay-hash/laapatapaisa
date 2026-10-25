// What we read from a photo of an old financial paper. Shared by the server
// (as the structured-output schema) and the browser (to show and save it).
import { z } from "zod";
import type { leadSources } from "@/lib/validation/case";

export const documentTypes = [
  "bank_passbook",
  "fixed_deposit_receipt",
  "share_certificate",
  "dividend_warrant",
  "company_letter",
  "insurance_policy",
  "premium_receipt",
  "mutual_fund_statement",
  "provident_fund_slip",
  "post_office_certificate",
  "other_financial_paper",
  "not_a_financial_paper",
] as const;

export const ScannedDocument = z.object({
  documentType: z.enum(documentTypes),
  holderName: z.string().nullable().describe("Main holder's name exactly as written"),
  jointHolders: z.array(z.string()).describe("Other holders named on the paper"),
  fatherOrHusbandName: z.string().nullable(),
  institution: z.string().nullable().describe("Company, bank, insurer, fund house or post office"),
  branch: z.string().nullable(),
  references: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .describe("Folio, account, policy, certificate or distinctive numbers, each with its label"),
  address: z.string().nullable(),
  pinCode: z.string().nullable().describe("Six-digit PIN code if printed"),
  amountRupees: z.number().nullable().describe("Main money amount on the paper, in rupees"),
  shares: z.number().nullable().describe("Number of shares or units, if a share or fund paper"),
  dates: z.array(z.object({ label: z.string(), value: z.string() })),
  nominee: z.string().nullable(),
  legibility: z.enum(["clear", "partly_readable", "unreadable"]),
  notes: z
    .string()
    .nullable()
    .describe("Anything that matters for a claim, in one or two sentences"),
});

export type ScannedDocument = z.infer<typeof ScannedDocument>;

export const documentTypeLabel: Record<(typeof documentTypes)[number], string> = {
  bank_passbook: "Bank passbook",
  fixed_deposit_receipt: "Fixed deposit receipt",
  share_certificate: "Share certificate",
  dividend_warrant: "Dividend warrant",
  company_letter: "Letter from a company",
  insurance_policy: "Insurance policy",
  premium_receipt: "Premium receipt",
  mutual_fund_statement: "Mutual fund statement",
  provident_fund_slip: "Provident fund slip",
  post_office_certificate: "Post office certificate",
  other_financial_paper: "Financial paper",
  not_a_financial_paper: "Not a financial paper",
};

/** Which place the money sits, for the lead created from a scan. */
export function sourceFor(type: ScannedDocument["documentType"]): (typeof leadSources)[number] {
  switch (type) {
    case "bank_passbook":
    case "fixed_deposit_receipt":
      return "bank";
    case "share_certificate":
    case "dividend_warrant":
    case "company_letter":
      return "shares";
    case "insurance_policy":
    case "premium_receipt":
      return "insurance";
    case "mutual_fund_statement":
      return "mutualFunds";
    case "provident_fund_slip":
      return "providentFund";
    case "post_office_certificate":
      return "postOffice";
    default:
      return "other";
  }
}

/** A short lead title such as "Dividend warrant: Tata Steel". */
export function leadTitleFor(doc: ScannedDocument): string {
  const label = documentTypeLabel[doc.documentType];
  return doc.institution ? `${label}: ${doc.institution}` : label;
}

/** The PIN, if the paper carries a valid one. */
export function pinFrom(doc: ScannedDocument): string | null {
  const fromField = doc.pinCode?.replace(/\D/g, "") ?? "";
  if (/^[1-9]\d{5}$/.test(fromField)) return fromField;
  const inAddress = doc.address?.match(/\b([1-9]\d{2})\s?(\d{3})\b/);
  return inAddress ? `${inAddress[1]}${inAddress[2]}` : null;
}
