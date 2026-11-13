import type { Couple } from "./couples";
import type { HistoryEntry } from "./history";

/** Returns a float in [0, 1), like `Math.random`. */
export type Rng = () => number;

export type Assignment = {
	giver: string;
	receiver: string;
};

export type DrawInput = {
	participants: readonly string[];
	history: readonly HistoryEntry[];
	/** Partners never draw each other, whatever the history setting. */
	couples: readonly Couple[];
	/** The year being drawn. Only earlier years constrain the draw. */
	year: number;
	/** How many previous years to avoid repeating; `null` checks them all. */
	lookbackYears: number | null;
	rng: Rng;
};

export type DrawFailureReason =
	| "too-few-participants"
	| "duplicate-participants"
	| "no-valid-pairing";

export type DrawResult =
	| { ok: true; assignments: Assignment[] }
	| { ok: false; reason: DrawFailureReason };
