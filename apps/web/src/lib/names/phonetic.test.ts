import { describe, expect, it } from "vitest";
import { matchStrength, nameKeys, nameTokens, phoneticKey } from "./phonetic";

describe("nameTokens", () => {
  it("strips honorifics and punctuation and expands clerical abbreviations", () => {
    expect(nameTokens("Late Shri Mahendra Pd. Mehta")).toEqual(["mahendra", "prasad", "mehta"]);
    expect(nameTokens("SMT. SITA DEVI")).toEqual(["sita", "devi"]);
    expect(nameTokens("Ramesh Ch. Sharma")).toEqual(["ramesh", "chandra", "sharma"]);
  });
});

describe("phoneticKey", () => {
  const same = (a: string, b: string) => expect(phoneticKey(a)).toBe(phoneticKey(b));

  it("folds common spelling differences in Indian names", () => {
    same("Mahendra", "Mahender");
    same("Mahendra", "Mahendr");
    same("Prasad", "Prashad");
    same("Chandra", "Chander");
    same("Chandra", "Chandar");
    same("Lakshmi", "Laxmi");
    same("Srivastava", "Shrivastava");
    same("Choudhary", "Chowdhary");
    same("Chaudhary", "Chaudhari");
    same("Yadav", "Yadaw");
    same("Krishna", "Krishan");
  });

  it("keeps genuinely different names apart", () => {
    expect(phoneticKey("Mahendra")).not.toBe(phoneticKey("Mahesh"));
    expect(phoneticKey("Mehta")).not.toBe(phoneticKey("Mishra"));
    expect(phoneticKey("Ram")).not.toBe(phoneticKey("Raj"));
    expect(phoneticKey("Mohan")).not.toBe(phoneticKey("Mahan"));
  });
});

describe("nameKeys", () => {
  it("separates first name, surname and initials", () => {
    const k = nameKeys("Mahendra Prasad Mehta");
    expect(k.first).toBe(phoneticKey("mahendra"));
    expect(k.last).toBe(phoneticKey("mehta"));
    expect(k.initials).toBe("mp");
  });

  it("treats a name made of initials as having no first name", () => {
    expect(nameKeys("M P Mehta").first).toBe("");
  });
});

describe("matchStrength", () => {
  it("rates spelling variants of the same full name as exact", () => {
    expect(matchStrength("Mahendra Prasad Mehta", "MAHENDER PRASHAD MEHTA")).toBe("exact");
  });

  it("rates a missing middle name as strong", () => {
    expect(matchStrength("Mahendra Prasad Mehta", "Mahendra Mehta")).toBe("strong");
  });

  it("rates initials with the right surname as possible", () => {
    expect(matchStrength("Mahendra Prasad Mehta", "M P Mehta")).toBe("possible");
  });

  it("rejects a different surname or a different first name", () => {
    expect(matchStrength("Mahendra Prasad Mehta", "Mahendra Prasad Yadav")).toBe("none");
    expect(matchStrength("Mahendra Mehta", "Mahesh Mehta")).toBe("none");
    expect(matchStrength("Mahendra Mehta", "S K Mehta")).toBe("none");
  });
});
