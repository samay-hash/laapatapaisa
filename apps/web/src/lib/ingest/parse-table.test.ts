import { describe, expect, it } from "vitest";
import { parseTable } from "./parse-table";

describe("parseTable", () => {
  it("reads the standard IEPF-2 layout with split name columns", () => {
    const table = [
      ["Statement of unclaimed and unpaid amounts"],
      ["CIN: L00000XX0000PLC000000"],
      [
        "Investor First Name",
        "Investor Middle Name",
        "Investor Last Name",
        "Father/Husband First Name",
        "Father/Husband Middle Name",
        "Father/Husband Last Name",
        "Address",
        "Country",
        "State",
        "District",
        "Pin Code",
        "Folio Number",
        "DP Id-Client Id-Account Number",
        "Investment Type",
        "Amount Due(in Rs.)",
        "Proposed Date of transfer to IEPF (DD-MON-YYYY)",
      ],
      [
        "MAHENDRA",
        "PRASAD",
        "MEHTA",
        "SURESH",
        "",
        "MEHTA",
        "WARD 4 PIPRA ROAD SUPAUL",
        "INDIA",
        "Bihar",
        "Supaul",
        "852215",
        "M0012345",
        "",
        "Amount for unclaimed and unpaid dividend",
        "1,250.50",
        "05-SEP-2026",
      ],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["NA", "", "", "", "", "", "SOMEWHERE", "INDIA", "", "", "", "X1", "", "", "10", ""],
    ];

    const result = parseTable(table)!;
    expect(result.headerRow).toBe(2);
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(1);
    expect(result.rows[0]).toEqual({
      investorName: "MAHENDRA PRASAD MEHTA",
      fatherName: "SURESH MEHTA",
      address: "WARD 4 PIPRA ROAD SUPAUL",
      district: "Supaul",
      state: "Bihar",
      pinCode: "852215",
      folio: "M0012345",
      amountPaise: 125050,
      shares: null,
      investmentType: "Amount for unclaimed and unpaid dividend",
      transferDate: "2026-09-05",
    });
  });

  it("reads a single name column and finds the PIN inside the address", () => {
    const table = [
      ["Sr. No.", "Name of the Shareholder", "Address", "Folio No.", "No. of Shares", "Pincode"],
      ["1", "Sita Devi", "Main Road, Supaul, Bihar 852215", "S-77", "100", ""],
    ];
    const row = parseTable(table)!.rows[0]!;
    expect(row.investorName).toBe("Sita Devi");
    expect(row.pinCode).toBe("852215");
    expect(row.shares).toBe(100);
    expect(row.folio).toBe("S-77");
  });

  it("handles a header split over two rows", () => {
    const table = [
      ["Name of Investor", "", "", "Address", "Pin Code", "Amount"],
      ["First Name", "Middle Name", "Last Name", "", "", ""],
      ["Ram", "Kumar", "Yadav", "Village Bhimpur", "852215", "300"],
    ];
    const result = parseTable(table)!;
    expect(result.rows[0]?.investorName).toBe("Ram Kumar Yadav");
    expect(result.rows[0]?.amountPaise).toBe(30000);
  });

  it("takes the first filled number when several columns look like amounts", () => {
    const table = [
      ["Name", "Pin Code", "Shares", "Shares transferred", "Amount", "Amount 2"],
      ["Vibha", "110007", "40", "40", "120.00", "120.00"],
    ];
    const row = parseTable(table)!.rows[0]!;
    expect(row.shares).toBe(40);
    expect(row.amountPaise).toBe(12000);
  });

  it("returns null when there is no name or PIN column", () => {
    expect(
      parseTable([
        ["Company", "Year"],
        ["ABC", "2020"],
      ]),
    ).toBeNull();
  });
});
