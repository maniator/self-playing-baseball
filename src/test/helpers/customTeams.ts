import type { CustomTeamDoc, TeamPlayer } from "@storage/types";

/**
 * Creates a minimal valid `TeamPlayer` with optional field overrides.
 * The generated `id` is random so each call produces a distinct player.
 */
export const makePlayer = (overrides: Partial<TeamPlayer> = {}): TeamPlayer => ({
  id: `p_${Math.random().toString(36).slice(2, 8)}`,
  name: "Alice",
  role: "batter",
  batting: { contact: 70, power: 60, speed: 50 },
  ...overrides,
});

/**
 * Creates a minimal valid `CustomTeamDoc` with optional field overrides.
 * The generated `id` is random so each call produces a distinct team.
 * The default lineup contains one player created by `makePlayer`.
 */
export const makeTeam = (overrides: Partial<CustomTeamDoc> = {}): CustomTeamDoc => ({
  id: `ct_test_${Math.random().toString(36).slice(2, 8)}`,
  schemaVersion: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  name: "Test Team",
  source: "custom",
  roster: {
    schemaVersion: 1,
    lineup: [makePlayer({ name: "Alice" })],
    bench: [],
    pitchers: [],
  },
  metadata: { archived: false },
  ...overrides,
});
