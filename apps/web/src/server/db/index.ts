import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/server/env";
import * as schema from "./schema";
import { sslFor } from "./ssl";

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ??
  new Pool({
    // Strip sslmode from the URL so the explicit, verified TLS settings below apply.
    connectionString: withoutSslMode(env.DATABASE_URL),
    ssl: sslFor(env.DATABASE_URL),
    max: env.NODE_ENV === "production" ? 5 : 10,
  });

if (env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });

function withoutSslMode(url: string): string {
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  return u.toString();
}
