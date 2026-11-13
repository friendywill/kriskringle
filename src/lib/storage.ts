import type { ZodMiniType } from "zod/mini";
import { type HistoryEntry, historySchema } from "../types/history";
import { participantsSchema } from "../types/participants";

/*
 * The only module allowed to touch localStorage.
 *
 * Stored data is a convenience, not a system of record. Reads never throw:
 * a missing, unparseable or wrongly-shaped value falls back to the empty
 * default documented on each function. Writes report success as a boolean so
 * the UI can say when nothing was saved.
 */

/** Every key is namespaced `kk:` and versioned; bump the version to migrate. */
export const STORAGE_KEYS = {
	history: "kk:v1:history",
	participants: "kk:v1:participants",
} as const;

function read<T>(key: string, schema: ZodMiniType<T>): T | null {
	try {
		const raw = localStorage.getItem(key);
		if (raw === null) return null;
		// Storage may hold an older shape or a hand-edited value: never trust it.
		const parsed = schema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : null;
	} catch {
		// Blocked storage and malformed JSON are expected, not error states.
		return null;
	}
}

function write<T>(key: string, schema: ZodMiniType<T>, value: T): boolean {
	try {
		localStorage.setItem(key, JSON.stringify(schema.parse(value)));
		return true;
	} catch (error) {
		console.error(`Could not save "${key}" to localStorage`, error);
		return false;
	}
}

/** Past pairings. Empty default: `[]` (no history). */
export function loadHistory(): HistoryEntry[] {
	return read(STORAGE_KEYS.history, historySchema) ?? [];
}

/** Replaces the stored history. Returns whether it was saved. */
export function saveHistory(history: readonly HistoryEntry[]): boolean {
	return write(STORAGE_KEYS.history, historySchema, [...history]);
}

/** People in the draw. Empty default: `[]` (nobody added yet). */
export function loadParticipants(): string[] {
	return read(STORAGE_KEYS.participants, participantsSchema) ?? [];
}

/** Replaces the stored participant list. Returns whether it was saved. */
export function saveParticipants(participants: readonly string[]): boolean {
	return write(STORAGE_KEYS.participants, participantsSchema, [
		...participants,
	]);
}
