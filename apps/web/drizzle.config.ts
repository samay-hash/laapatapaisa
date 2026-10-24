import { defineConfig } from "drizzle-kit";
import { sslFor } from "./src/server/db/ssl";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on variables already set (CI, Vercel).
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const url = new URL(process.env.DATABASE_URL);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1) || "postgres",
    ssl: sslFor(url.toString()) ?? false,
  },
  strict: true,
  verbose: true,
});
