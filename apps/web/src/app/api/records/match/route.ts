import type { NextRequest } from "next/server";
import { z } from "zod";
import { matchName } from "@/server/records-search";
import { badRequest, nameSchema, pinSchema, respond } from "../_shared";

const body = z.object({ pin: pinSchema, name: nameSchema });

export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Enter a PIN code and a full name");
  return respond(() => matchName(parsed.data.pin, parsed.data.name));
}
