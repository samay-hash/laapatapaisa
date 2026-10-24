import type { NextRequest } from "next/server";
import { suggestFirstNames } from "@/server/records-search";
import { badRequest, pinSchema, respond } from "../_shared";

export async function GET(request: NextRequest) {
  const pin = pinSchema.safeParse(request.nextUrl.searchParams.get("pin"));
  const q = (request.nextUrl.searchParams.get("q") ?? "").replace(/[^a-zA-Z]/g, "");
  if (!pin.success) return badRequest("Enter a 6-digit PIN code");
  if (q.length < 2 || q.length > 30) return respond(async () => []);
  return respond(() => suggestFirstNames(pin.data, q));
}
