import type { NextRequest } from "next/server";
import { pinSummary } from "@/server/records-search";
import { badRequest, pinSchema, respond } from "../_shared";

export async function GET(request: NextRequest) {
  const pin = pinSchema.safeParse(request.nextUrl.searchParams.get("pin"));
  if (!pin.success) return badRequest("Enter a 6-digit PIN code");
  return respond(() => pinSummary(pin.data));
}
