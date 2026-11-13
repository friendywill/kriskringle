import type { Rng } from "../types/draw";
import { type AddParticipantsResult, nameSchema } from "../types/participants";

/** Trims and collapses inner whitespace so a name displays consistently. */
export function cleanName(name: string): string {
	return name.trim().replace(/\s+/g, " ");
}

/**
 * Comparison key for a name: "alice", " Alice " and "ALICE" are one person.
 * Use this to compare names; keep the original for display.
 */
export function nameKey(name: string): string {
	return cleanName(name).normalize("NFKC").toLowerCase();
}

/**
 * Adds comma-separated names to the list, skipping any that are already on
 * it (ignoring case and spacing) or that are not valid names.
 */
export function addParticipants(
	existing: readonly string[],
	input: string,
): AddParticipantsResult {
	const participants = [...existing];
	const skipped: string[] = [];
	const taken = new Set(existing.map(nameKey));

	for (const candidate of input.split(",").map(cleanName)) {
		if (candidate === "") continue;
		const key = nameKey(candidate);
		if (taken.has(key) || !nameSchema.safeParse(candidate).success) {
			skipped.push(candidate);
			continue;
		}
		taken.add(key);
		participants.push(candidate);
	}

	return { participants, skipped };
}

/**
 * Mulberry32 — a tiny seeded PRNG. The same seed always yields the same
 * sequence, which keeps the draw deterministic and testable.
 */
export function createRng(seed: number): Rng {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let mixed = state;
		mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
	};
}

/** Returns a shuffled copy, drawing all randomness from the given RNG. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
	const pool = [...items];
	const shuffled: T[] = [];
	while (pool.length > 0) {
		// Clamp so an RNG that wrongly returns 1 cannot pick past the end.
		const index = Math.min(Math.floor(rng() * pool.length), pool.length - 1);
		shuffled.push(...pool.splice(index, 1));
	}
	return shuffled;
}
