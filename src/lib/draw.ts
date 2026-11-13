import type {
	Assignment,
	DrawFailureReason,
	DrawInput,
	DrawResult,
} from "../types/draw";
import type { HistoryEntry } from "../types/history";
import { nameKey, shuffle } from "./utils";

function pairKey(giver: string, receiver: string): string {
	return `${nameKey(giver)}\u0000${nameKey(receiver)}`;
}

function fail(reason: DrawFailureReason): DrawResult {
	return { ok: false, reason };
}

/**
 * The rotation rule: pairings from earlier years that must not be repeated.
 * The year being drawn is ignored so it can be re-drawn after saving, and
 * `lookbackYears` limits how far back the rule reaches.
 */
function blockedPairs(
	history: readonly HistoryEntry[],
	year: number,
	lookbackYears: number | null,
): Set<string> {
	const earliest =
		lookbackYears === null ? Number.NEGATIVE_INFINITY : year - lookbackYears;
	return new Set(
		history
			.filter((entry) => entry.year < year && entry.year >= earliest)
			.map((entry) => pairKey(entry.giver, entry.receiver)),
	);
}

/**
 * Kuhn's augmenting-path algorithm for bipartite matching. Gives every giver
 * a distinct receiver from their allowed list, re-homing earlier givers when
 * needed. Returns receiver -> giver, or `null` when no complete matching
 * exists — a giver that cannot be placed now can never be placed.
 */
function matchGivers(
	givers: readonly string[],
	allowed: ReadonlyMap<string, readonly string[]>,
): Map<string, string> | null {
	const giverOf = new Map<string, string>();

	const place = (giver: string, tried: Set<string>): boolean => {
		for (const receiver of allowed.get(giver) ?? []) {
			if (tried.has(receiver)) continue;
			tried.add(receiver);
			const current = giverOf.get(receiver);
			if (current === undefined || place(current, tried)) {
				giverOf.set(receiver, giver);
				return true;
			}
		}
		return false;
	};

	for (const giver of givers) {
		if (!place(giver, new Set())) return null;
	}
	return giverOf;
}

/**
 * Draws who gives to whom. Nobody draws themselves, everybody gives and
 * receives exactly once, and no pairing from the checked history repeats.
 *
 * Pure and deterministic: the same input and RNG sequence always produce the
 * same result. Returns a failure rather than throwing when the rules cannot
 * be met, so the caller can explain why.
 */
export function drawAssignments({
	participants,
	history,
	year,
	lookbackYears,
	rng,
}: DrawInput): DrawResult {
	if (participants.length < 2) return fail("too-few-participants");

	const keys = new Set(participants.map(nameKey));
	if (keys.size !== participants.length) return fail("duplicate-participants");

	const blocked = blockedPairs(history, year, lookbackYears);
	const allowed = new Map(
		participants.map((giver): [string, string[]] => {
			const receivers = participants.filter(
				(receiver) =>
					nameKey(receiver) !== nameKey(giver) &&
					!blocked.has(pairKey(giver, receiver)),
			);
			return [giver, shuffle(receivers, rng)];
		}),
	);

	const giverOf = matchGivers(shuffle(participants, rng), allowed);
	if (giverOf === null) return fail("no-valid-pairing");

	const receiverOf = new Map(
		[...giverOf].map(([receiver, giver]) => [giver, receiver]),
	);
	const assignments = participants.flatMap((giver): Assignment[] => {
		const receiver = receiverOf.get(giver);
		return receiver === undefined ? [] : [{ giver, receiver }];
	});

	return { ok: true, assignments };
}
