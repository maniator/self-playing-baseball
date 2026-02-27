/**
 * Stable, cryptographically-strong ID generation for all local-first RxDB documents.
 *
 * RxDB does NOT auto-generate primary keys — the application is responsible for
 * providing unique `id` values before inserting documents. This module is the single
 * source of truth for that responsibility.
 *
 * Why nanoid instead of Date.now() + Math.random():
 *   - Uses the platform CSPRNG (crypto.getRandomValues) — no timestamp leakage
 *   - 12 URL-safe chars → ~71 bits of entropy — collision probability negligible for
 *     any realistic number of local documents
 *   - Compact and consistent format; no embedding wall-clock time into the primary key
 *
 * Prefixes are kept because:
 *   - They make log messages / debug output immediately meaningful
 *   - Save import validation uses `field.startsWith("ct_")` to detect custom-team refs
 */
import { nanoid } from "nanoid";

/** Generates a unique ID for a custom team document. e.g. `ct_V1StGXR8_Z5j` */
export const generateTeamId = (): string => `ct_${nanoid(12)}`;

/** Generates a unique ID for a roster player (not stored in DB — part of team doc). */
export const generatePlayerId = (): string => `p_${nanoid(12)}`;

/** Generates a unique ID for a save document. e.g. `save_V1StGXR8_Z5j` */
export const generateSaveId = (): string => `save_${nanoid(12)}`;
