import type { Couple } from "./couples";
import type { Family } from "./families";
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

export type KidsDrawInput = {
	/** Everyone on the people list. Each buys for a child where they can. */
	adults: readonly string[];
	families: readonly Family[];
	/** Past kids' presents: adult gave to child. */
	history: readonly HistoryEntry[];
	/** The year being drawn. Only earlier years count as "bought before". */
	year: number;
	rng: Rng;
};

export type KidsDrawResult =
	| {
			ok: true;
			/** One child per adult, never the adult's own child. */
			assignments: Assignment[];
			/** Children nobody could be given: too few adults, or only parents. */
			kidsWithoutPresent: string[];
			/** Adults with no child outside their own family to buy for. */
			adultsWithoutKid: string[];
			/** Assignments repeating an earlier year; only made when unavoidable. */
			repeats: Assignment[];
	  }
	| { ok: false; reason: "no-kids" | "no-adults" };
