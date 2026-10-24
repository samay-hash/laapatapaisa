import type { NextRequest } from "next/server";
import { z } from "zod";
import { confirmRecord } from "@/server/records-search";
import { badRequest, nameSchema, respond } from "../_shared";

const body = z.object({
  id: z.uuid(),
  name: nameSchema,
  father: z.string().trim().max(120).default(""),
});

export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Missing record or name");
  return respond(() => confirmRecord(parsed.data.id, parsed.data.name, parsed.data.father));
}
