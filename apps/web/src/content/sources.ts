// Single source of truth for the places unclaimed money ends up.
// Used by the landing page register and by the free check results.
// Keep claims here conservative and re-verify official links before launch.

export type SourceId =
  "bank" | "shares" | "insurance" | "mutualFunds" | "providentFund" | "postOffice";

export type MoneySource = {
  id: SourceId;
  name: string;
  goesQuietWhen: string;
  whereItSits: string;
  howToSearch: string;
  cluesAtHome: string;
  officialLink: { label: string; href: string };
};

export const sources: readonly MoneySource[] = [
  {
    id: "bank",
    name: "Bank accounts and FDs",
    goesQuietWhen: "No activity for 10 years",
    whereItSits: "Moved to RBI's DEA Fund. The original bank still pays the claim.",
    howToSearch: "RBI's UDGAM portal, plus each bank's published list of unclaimed deposits.",
    cluesAtHome: "Passbooks, FD receipts, cheque books, letters from the bank",
    officialLink: { label: "RBI UDGAM", href: "https://udgam.rbi.org.in" },
  },
  {
    id: "shares",
    name: "Shares and dividends",
    goesQuietWhen: "Dividend unclaimed for 7 years in a row",
    whereItSits: "Shares and dividends move to the IEPF Authority.",
    howToSearch: "IEPF's public search by name, and the company's own list of unpaid dividends.",
    cluesAtHome: "Share certificates, dividend warrants, annual reports that came by post",
    officialLink: { label: "IEPF Authority", href: "https://www.iepf.gov.in" },
  },
  {
    id: "insurance",
    name: "Life insurance",
    goesQuietWhen: "Maturity or death claim never collected",
    whereItSits: "Held by the insurer, then moved to the Senior Citizens' Welfare Fund.",
    howToSearch: "Every insurer runs an unclaimed amount search on its website, as IRDAI requires.",
    cluesAtHome: "Policy bonds, premium receipts, letters from an agent",
    officialLink: { label: "LIC of India", href: "https://licindia.in" },
  },
  {
    id: "mutualFunds",
    name: "Mutual funds",
    goesQuietWhen: "No activity in a folio for 10 years",
    whereItSits: "Units stay with the fund house, often with an outdated address on file.",
    howToSearch: "SEBI's MITRA tracing tool, reached through MF Central, AMFI or the fund house.",
    cluesAtHome: "Statements from CAMS or KFintech, fund house letters",
    officialLink: { label: "MF Central", href: "https://www.mfcentral.com" },
  },
  {
    id: "providentFund",
    name: "Provident fund",
    goesQuietWhen: "Left an old job without a final claim",
    whereItSits: "Sits in an inoperative EPF account under the old employer.",
    howToSearch: "EPFO records, often with help from the former employer.",
    cluesAtHome: "Salary slips, PF slips, appointment or relieving letters",
    officialLink: { label: "EPFO", href: "https://www.epfindia.gov.in" },
  },
  {
    id: "postOffice",
    name: "Post office savings",
    goesQuietWhen: "NSC, KVP or savings account left untouched",
    whereItSits:
      "Stays with India Post. Long-unclaimed sums move to the Senior Citizens' Welfare Fund.",
    howToSearch: "A branch visit with the certificate or passbook.",
    cluesAtHome: "NSC or KVP certificates, post office passbooks",
    officialLink: { label: "India Post", href: "https://www.indiapost.gov.in" },
  },
];

export function getSource(id: SourceId): MoneySource {
  const source = sources.find((s) => s.id === id);
  if (!source) throw new Error(`Unknown source: ${id}`);
  return source;
}
