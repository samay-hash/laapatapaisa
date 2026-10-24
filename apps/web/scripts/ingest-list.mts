// Imports every file in a sources list (JSON array of { company, url, format,
// financial_year, kind }) by running the single-file importer for each.
//   pnpm data:ingest-list sources.json [--max-mb 10] [--formats xlsx,xls] [--dry-run]
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "max-mb": { type: "string", default: "10" },
    formats: { type: "string", default: "xlsx,xls,pdf" },
    "dry-run": { type: "boolean", default: false },
  },
});

type Source = {
  company: string;
  url: string;
  format: string;
  financial_year?: string;
  kind: string;
  content_length?: number;
};

const list = JSON.parse(readFileSync(positionals[0] ?? "", "utf8")) as Source[];
const formats = new Set(args.formats!.split(","));
const maxBytes = Number(args["max-mb"]) * 1024 * 1024;

const results: { company: string; fy: string; status: string; detail: string }[] = [];
for (const s of list) {
  const fy = s.financial_year ?? "";
  if (!formats.has(s.format)) {
    results.push({ company: s.company, fy, status: "skipped", detail: `format ${s.format}` });
    continue;
  }
  if ((s.content_length ?? 0) > maxBytes) {
    results.push({
      company: s.company,
      fy,
      status: "skipped",
      detail: `${Math.round((s.content_length ?? 0) / 1048576)} MB`,
    });
    continue;
  }
  const run = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "scripts/ingest.mts",
      "--url",
      s.url,
      "--company",
      s.company,
      "--kind",
      ["unclaimed_dividend", "shares_transferred_to_iepf"].includes(s.kind) ? s.kind : "other",
      ...(fy ? ["--fy", fy] : []),
      ...(args["dry-run"] ? ["--dry-run"] : []),
    ],
    { encoding: "utf8", timeout: 600_000 },
  );
  const out = `${run.stdout}\n${run.stderr}`;
  const summary = out.split("\n").find((l) => l.includes("records parsed")) ?? "";
  const status =
    run.status === 0 ? (out.includes("Already imported") ? "already" : "ok") : "failed";
  const detail =
    summary ||
    out
      .split("\n")
      .filter((l) => l.trim() && !l.startsWith("Warning"))
      .slice(-2)
      .join(" | ");
  results.push({ company: s.company, fy, status, detail: detail.slice(0, 160) });
  console.log(`[${status}] ${s.company} ${fy}: ${detail.slice(0, 160)}`);
}

const by = (st: string) => results.filter((r) => r.status === st).length;
console.log(
  `\nDone: ${by("ok")} imported, ${by("already")} already there, ${by("failed")} failed, ${by("skipped")} skipped.`,
);
