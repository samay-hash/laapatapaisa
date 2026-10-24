// Saves one secret into apps/web/.env.local without it appearing on screen,
// in shell history or in chat. Usage: pnpm env:set DATABASE_URL
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const file = new URL("../apps/web/.env.local", import.meta.url);
const name = process.argv[2];

if (!name || !/^[A-Z][A-Z0-9_]*$/.test(name)) {
  console.error("Usage: pnpm env:set NAME   (for example: pnpm env:set DATABASE_URL)");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let muted = false;
rl._writeToOutput = (s) => {
  if (!muted) rl.output.write(s);
};
rl.question(`Paste ${name} and press Enter (it will not be shown): `, (answer) => {
  rl.output.write("\n");
  rl.close();
  const value = answer.trim().replace(/^["']|["']$/g, "");
  if (!value) {
    console.error("Nothing pasted. No changes made.");
    process.exit(1);
  }
  if (/[\r\n]/.test(value)) {
    console.error("The value has a line break in it. No changes made.");
    process.exit(1);
  }

  const lines = existsSync(file) ? readFileSync(file, "utf8").split("\n") : [];
  const line = `${name}=${/[\s#"]/.test(value) ? JSON.stringify(value) : value}`;
  const i = lines.findIndex((l) => l.startsWith(`${name}=`));
  if (i >= 0) lines[i] = line;
  else lines.splice(lines.at(-1) === "" ? lines.length - 1 : lines.length, 0, line);
  writeFileSync(file, lines.join("\n").replace(/\n?$/, "\n"));
  chmodSync(file, 0o600);
  console.log(`Saved ${name} (${value.length} characters) to apps/web/.env.local`);
});
muted = true;
