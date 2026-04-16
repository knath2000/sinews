import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const routePath = resolve(root, "src/app/api/history-imports/[id]/process/route.ts");
const parserPath = resolve(root, "src/server/history-import/safari-parser.ts");
const constantsPath = resolve(root, "src/lib/constants.ts");

function read(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: unknown, message: string): void {
  if (!condition) fail(message);
}

const route = read(routePath);
const parser = read(parserPath);
const constants = read(constantsPath);

// 1. Raw ZIPs are deleted after processing.
assert(route.includes("try {"), "process route should use try/finally");
assert(route.includes("finally {"), "process route should use finally for cleanup");
assert(route.includes("await deleteZip(dbUser.id, id);"), "process route should delete the ZIP");
assert(route.includes("zipDeleted = true;"), "process route should mark successful cleanup");
assert(route.includes("if (!zipDeleted) {"), "process route should retry cleanup in finally");

// 2. Preview responses do not expose raw URLs.
const previewMatch = route.match(/const preview = \{([\s\S]*?)\n\s*\};/);
assert(previewMatch, "process route should define a preview object");
const previewBlock = previewMatch?.[1] ?? "";
for (const key of ["topDomains", "topicCounts", "dateRange", "totalVisits", "acceptedCount", "rejectedCount", "schemaVersion"]) {
  assert(previewBlock.includes(key), `preview object should include ${key}`);
}
for (const forbidden of ["raw_value", "source_reference", "history", "visit", "url", "urls", "password", "card"]) {
  assert(!previewBlock.includes(forbidden), `preview object should not expose ${forbidden}`);
}

// 3. No raw browsing data goes to Sentry/logs.
for (const file of [route, parser]) {
  assert(!/console\.(log|info|warn|error|debug)\s*\(/.test(file), "no console logging in parser/process route");
  assert(!/Sentry\./.test(file), "no Sentry logging in parser/process route");
}

// 4. Ranking safety rail.
assert(
  constants.includes("HISTORY_IMPORT_DOMAIN_WEIGHT_CAP = 0.5"),
  "HISTORY_IMPORT_DOMAIN_WEIGHT_CAP must exist in constants"
);
assert(
  parser.includes("HISTORY_IMPORT_DOMAIN_WEIGHT_CAP"),
  "parser must read HISTORY_IMPORT_DOMAIN_WEIGHT_CAP"
);

console.log("PASS: privacy guarantees and ranking safety rail verified");
