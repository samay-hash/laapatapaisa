import { describe, expect, it } from "vitest";
import { leadTitleFor, pinFrom, ScannedDocument, sourceFor } from "./document";

const base: ScannedDocument = {
  documentType: "dividend_warrant",
  holderName: "Mahendra Prasad Mehta",
  jointHolders: [],
  fatherOrHusbandName: "Suresh Mehta",
  institution: "Tata Steel Ltd",
  branch: null,
  references: [{ label: "Folio", value: "M0012345" }],
  address: "Ward 4, Main Road, Supaul, Bihar 852 215",
  pinCode: null,
  amountRupees: 1250.5,
  shares: 100,
  dates: [],
  nominee: null,
  legibility: "clear",
  notes: null,
};

describe("scanned document helpers", () => {
  it("maps each kind of paper to where the money sits", () => {
    expect(sourceFor("bank_passbook")).toBe("bank");
    expect(sourceFor("dividend_warrant")).toBe("shares");
    expect(sourceFor("premium_receipt")).toBe("insurance");
    expect(sourceFor("post_office_certificate")).toBe("postOffice");
    expect(sourceFor("other_financial_paper")).toBe("other");
  });

  it("builds a readable lead title", () => {
    expect(leadTitleFor(base)).toBe("Dividend warrant: Tata Steel Ltd");
    expect(leadTitleFor({ ...base, institution: null })).toBe("Dividend warrant");
  });

  it("finds the PIN in its own field or inside the address, spaced or not", () => {
    expect(pinFrom({ ...base, pinCode: "852215" })).toBe("852215");
    expect(pinFrom(base)).toBe("852215");
    expect(pinFrom({ ...base, address: "Supaul", pinCode: "PIN 8522" })).toBeNull();
  });

  it("validates scan results coming back from the browser", () => {
    expect(ScannedDocument.safeParse(base).success).toBe(true);
    expect(ScannedDocument.safeParse({ ...base, documentType: "aadhaar_card" }).success).toBe(
      false,
    );
  });
});
