import "server-only";
import { createHmac } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { searchEvent } from "@/server/db/schema";
import { env } from "@/server/env";

// Per-IP or per-user limits for searches and scans, backed by the search_event
// log, which doubles as the audit trail for spotting misuse.

export type EventKind = (typeof searchEvent.kind.enumValues)[number];

const LIMITS: Record<EventKind, { window: "hour" | "day"; max: number; perUser: boolean }> = {
  summary: { window: "hour", max: 60, perUser: false },
  suggest: { window: "hour", max: 400, perUser: false },
  match: { window: "day", max: 40, perUser: true },
  confirm: { window: "day", max: 30, perUser: true },
  scan: { window: "day", max: 20, perUser: true },
};

export class RateLimitError extends Error {}

async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(ip).digest("hex").slice(0, 32);
}

/** Throws RateLimitError when over the limit; returns the hashed IP for logging. */
export async function guard(kind: EventKind, userId: string | null): Promise<string> {
  const ipHash = await clientIpHash();
  const rule = LIMITS[kind];
  const since = new Date(Date.now() - (rule.window === "hour" ? 3600_000 : 86_400_000));
  const who =
    rule.perUser && userId ? eq(searchEvent.userId, userId) : eq(searchEvent.ipHash, ipHash);
  const [row] = await db
    .select({ n: count() })
    .from(searchEvent)
    .where(and(who, eq(searchEvent.kind, kind), gte(searchEvent.createdAt, since)));
  if ((row?.n ?? 0) >= rule.max) {
    throw new RateLimitError(
      rule.window === "hour"
        ? "Too many requests from this connection. Try again in an hour."
        : "You have reached today's limit. Try again tomorrow.",
    );
  }
  return ipHash;
}

export async function logEvent(
  kind: EventKind,
  ipHash: string,
  userId: string | null,
  pinCode: string | null,
  query: string | null,
  resultCount: number,
) {
  await db.insert(searchEvent).values({ kind, ipHash, userId, pinCode, query, resultCount });
}
