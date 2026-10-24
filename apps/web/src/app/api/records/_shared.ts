import { NextResponse } from "next/server";
import { z } from "zod";
import { RateLimitError } from "@/server/records-search";

export const pinSchema = z.string().regex(/^[1-9]\d{5}$/, "Enter a 6-digit PIN code");
export const nameSchema = z.string().trim().min(2).max(120);

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

const outcomes = {
  signin: { status: 401, error: "Log in to see matching records." },
  mismatch: {
    status: 422,
    error: "That name does not match the father's or husband's name on this record.",
  },
} as const;

/** Runs a search and maps its outcome to a JSON response. Unknown errors become a bare 500. */
export async function respond<T>(work: () => Promise<T>) {
  try {
    const result = await work();
    if (result === null) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    if (typeof result === "string" && result in outcomes) {
      const o = outcomes[result as keyof typeof outcomes];
      return NextResponse.json({ error: o.error, code: result }, { status: o.status });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error(error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
