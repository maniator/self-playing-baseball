#!/usr/bin/env node
/**
 * Checks E2E spec file sizes and warns/fails based on thresholds.
 * - Warn:  >= 500 lines
 * - Fail:  >= 900 lines
 *
 * Prevents E2E spec files from growing into unmaintainable mega-files.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const WARN_THRESHOLD = 500;
const FAIL_THRESHOLD = 900;

function findSpecFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findSpecFiles(full));
    } else if (entry.name.endsWith(".spec.ts")) {
      files.push(full);
    }
  }
  return files;
}

const files = findSpecFiles("e2e/tests").sort();

let hasFailure = false;
let hasWarning = false;

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n").filter((l) => l.length > 0).length;
  if (lines >= FAIL_THRESHOLD) {
    console.error(`❌ FAIL: ${file} has ${lines} lines (limit: ${FAIL_THRESHOLD})`);
    hasFailure = true;
  } else if (lines >= WARN_THRESHOLD) {
    console.warn(`⚠️  WARN: ${file} has ${lines} lines (warn at: ${WARN_THRESHOLD})`);
    hasWarning = true;
  }
}

if (!hasFailure && !hasWarning) {
  console.log("✅ All E2E spec files are within size limits.");
}

if (hasFailure) {
  console.error(
    `\nSplit oversized spec files into smaller, feature-focused files.\nGroup related visual tests in subdirectories under e2e/tests/ (e.g., e2e/tests/visual/).`,
  );
  process.exit(1);
}
