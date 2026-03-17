#!/usr/bin/env node
/**
 * @deprecated Prefer `scripts/regenerate-fixtures.test.ts` which uses the REAL
 * TypeScript source functions via `yarn vitest run scripts/regenerate-fixtures.test.ts`.
 * That approach is always in sync with the actual app code and requires no
 * manual reimplementation of hash formulas.
 *
 * This script is kept as a fallback for environments where vitest is not
 * available (e.g. outside the repo root).
 *
 * Regenerates player `sig` fields in all E2E fixture JSON files.
 *
 * Run this script whenever `buildPlayerSig` formula changes in
 * `src/features/customTeams/storage/customTeamSignatures.ts`, then
 * re-check all fixture files for correctness.
 *
 * Usage:
 *   node scripts/regenerate-player-sigs.mjs
 *   # or target a specific file:
 *   node scripts/regenerate-player-sigs.mjs e2e/fixtures/fixture-teams.json
 *
 * The script also recomputes the top-level bundle `sig` on each fixture so
 * that the import parser accepts the regenerated files without errors.
 *
 * Formula (must stay in sync with customTeamSignatures.ts :: buildPlayerSig):
 *   fnv1a(JSON.stringify({ name, role, batting, pitching }))
 *
 * Formula (must stay in sync with customTeamSignatures.ts :: buildTeamFingerprint):
 *   fnv1a(team.id + team.name.toLowerCase() + "|" + (team.abbreviation ?? "").toLowerCase())
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── FNV-1a 32-bit (mirrors src/storage/hash.ts) ──────────────────────────────
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// ── Player sig (mirrors buildPlayerSig) ──────────────────────────────────────
function buildPlayerSig(player) {
  const { name, role, batting, pitching } = player;
  return fnv1a(JSON.stringify({ name, role, batting, pitching }));
}

// ── Team fingerprint (mirrors buildTeamFingerprint) ──────────────────────────
function buildTeamFingerprint(team) {
  const key = team.name.toLowerCase() + "|" + (team.abbreviation ?? "").toLowerCase();
  return fnv1a(team.id + key);
}

// ── Bundle sig (mirrors the export bundle signing in customTeamStore) ─────────
// The bundle sig covers the full payload after player sigs are embedded.
// Signing key must stay in sync with TEAMS_EXPORT_KEY in customTeamSignatures.ts.
const TEAMS_EXPORT_KEY = "ballgame:teams:v1";

function buildBundleSig(payload) {
  return fnv1a(TEAMS_EXPORT_KEY + JSON.stringify(payload));
}

// ── Process a single fixture file ────────────────────────────────────────────
function processFile(filePath) {
  const raw = readFileSync(filePath, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.log(`  skip (not valid JSON): ${filePath}`);
    return;
  }

  // Only process files that look like team-export bundles
  if (!data.teams || !Array.isArray(data.teams)) {
    console.log(`  skip (no .teams array): ${filePath}`);
    return;
  }

  let changed = false;

  // 1. Recompute player sigs for every player in every section
  for (const team of data.teams) {
    for (const section of ["lineup", "bench", "pitchers"]) {
      const players = team.roster?.[section];
      if (!Array.isArray(players)) continue;
      for (const player of players) {
        if (!("sig" in player)) continue; // only update pre-existing sig fields
        const newSig = buildPlayerSig(player);
        if (player.sig !== newSig) {
          player.sig = newSig;
          changed = true;
        }
      }
    }

    // 2. Recompute team fingerprint
    if ("fingerprint" in team) {
      const newFp = buildTeamFingerprint(team);
      if (team.fingerprint !== newFp) {
        team.fingerprint = newFp;
        changed = true;
      }
    }
  }

  // 3. Recompute the top-level bundle sig (covers teams array with updated player sigs)
  if ("sig" in data) {
    // The bundle sig covers { teams } — build a payload with just the teams list
    const payload = { teams: data.teams };
    const newBundleSig = buildBundleSig(payload);
    if (data.sig !== newBundleSig) {
      data.sig = newBundleSig;
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log(`  updated: ${filePath}`);
  } else {
    console.log(`  ok (no changes): ${filePath}`);
  }
}

// ── Collect target files ──────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const args = process.argv.slice(2);
let targets;

if (args.length > 0) {
  targets = args.map((a) => resolve(a));
} else {
  // Default: all JSON files under e2e/fixtures/
  const fixtureDir = join(repoRoot, "e2e", "fixtures");
  targets = readdirSync(fixtureDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => join(fixtureDir, f));
}

console.log(`Regenerating player sigs in ${targets.length} file(s)…`);
for (const t of targets) {
  processFile(t);
}
console.log("Done.");
