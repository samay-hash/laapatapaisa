import { describe, expect, it } from "vitest";
import { MAX_VARIANTS, generateNameVariants, nameParts } from "./name-variants";

describe("nameParts", () => {
  it("drops honorifics and punctuation and fixes case", () => {
    expect(nameParts("Late Shri RAMESH  chandra sharma.")).toEqual(["Ramesh", "Chandra", "Sharma"]);
    expect(nameParts("Smt. Laxmi Devi")).toEqual(["Laxmi", "Devi"]);
    expect(nameParts("Sunita Kumari")).toEqual(["Sunita", "Kumari"]);
  });
});

describe("generateNameVariants", () => {
  const variants = generateNameVariants("Late Shri Ramesh Chandra Sharma");

  it("starts with the clean full name", () => {
    expect(variants[0]).toBe("Ramesh Chandra Sharma");
  });

  it("includes initials in the forms used in old records", () => {
    expect(variants).toContain("R. C. Sharma");
    expect(variants).toContain("R C Sharma");
    expect(variants).toContain("RC Sharma");
  });

  it("includes the name without the middle name and with it as an initial", () => {
    expect(variants).toContain("Ramesh Sharma");
    expect(variants).toContain("Ramesh C. Sharma");
  });

  it("includes clerical abbreviations and surname-first order", () => {
    expect(variants).toContain("Ramesh Ch. Sharma");
    expect(variants).toContain("Sharma Ramesh Chandra");
    expect(variants).toContain("Sharma R C");
  });

  it("includes alternative spellings", () => {
    expect(variants).toContain("Ramesh Chander Sharma");
  });

  it("never repeats a variant, ignoring case, and stays within the limit", () => {
    const many = generateNameVariants("Mohammad Chandra Prasad Kumar Srivastava");
    expect(new Set(many.map((v) => v.toLowerCase())).size).toBe(many.length);
    expect(many.length).toBeLessThanOrEqual(MAX_VARIANTS);
  });

  it("handles single names and empty input", () => {
    expect(generateNameVariants("Laxmi")).toEqual(["Laxmi", "Lakshmi", "Lakshmy"]);
    expect(generateNameVariants("  Shri  ")).toEqual([]);
  });
});
