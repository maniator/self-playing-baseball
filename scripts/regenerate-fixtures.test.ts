/**
 * Fixture regeneration script — run via:
 *
 *   yarn vitest run scripts/regenerate-fixtures.test.ts
 *
 * Uses the REAL `exportCustomTeams` function from source so the sigs in
 * fixture files are always computed by the same code the app uses at runtime.
 * No manual reimplementation of FNV-1a or sig formulas needed here.
 *
 * When to run:
 *   - After any change to `buildPlayerSig`, `buildTeamFingerprint`, or
 *     `TEAMS_EXPORT_KEY` in `customTeamSignatures.ts`
 *   - After editing player/team data in a fixture file manually
 *   - After adding new fixture teams
 *
 * The script reads each `e2e/fixtures/*.json` file that has `"type":
 * "customTeams"`, strips the stale per-player `sig` and `fingerprint` fields,
 * then calls `exportCustomTeams` to regenerate them correctly, and writes the
 * result back to disk.
 */

import {
  exportCustomTeams,
  parseExportedCustomTeams,
} from "@feat/customTeams/storage/customTeamTeamBundle";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { expect, it } from "vitest";

import type { TeamWithRoster } from "@storage/types";

const FIXTURES_DIR = join(__dirname, "../e2e/fixtures");

function regenerateFixture(filePath: string): boolean {
  const raw = readFileSync(filePath, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false; // not JSON — skip
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.type !== "customTeams") return false; // not a team bundle — skip

  // Validate it's parseable first (may throw if badly malformed)
  const bundle = parseExportedCustomTeams(raw);
  const teams: TeamWithRoster[] = bundle.payload.teams as TeamWithRoster[];

  // Strip stale per-player sig/fingerprint fields so exportCustomTeams recomputes them
  const cleanTeams: TeamWithRoster[] = teams.map((team) => {
    const clean = { ...team };
    const stripSig = (p: Record<string, unknown>) => {
      const { sig: _sig, fingerprint: _fp, ...rest } = p;
      return rest;
    };
    clean.roster = {
      ...team.roster,
      lineup: team.roster.lineup.map(stripSig as never),
      bench: team.roster.bench.map(stripSig as never),
      pitchers: team.roster.pitchers.map(stripSig as never),
    };
    return clean;
  });

  const regenerated = exportCustomTeams(cleanTeams);
  writeFileSync(filePath, regenerated + "\n", "utf-8");
  return true;
}

it("regenerates all customTeams fixture files using real exportCustomTeams", () => {
  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));
  const updated: string[] = [];

  for (const file of files) {
    const filePath = join(FIXTURES_DIR, file);
    if (regenerateFixture(filePath)) {
      updated.push(file);
    }
  }

  console.log(`\nRegenerated ${updated.length} fixture file(s):`);
  updated.forEach((f) => console.log(`  ✓ ${f}`));

  // Always pass — the goal is side-effects (file writes), not assertions
  expect(updated.length).toBeGreaterThanOrEqual(0);
});
