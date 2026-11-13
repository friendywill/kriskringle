import type { Couple } from "../types/couples";
import { nameKey } from "./utils";

/** People on the list who are not yet part of a couple. */
export function unpairedPeople(
	participants: readonly string[],
	couples: readonly Couple[],
): string[] {
	const paired = new Set(couples.flat().map(nameKey));
	return participants.filter((name) => !paired.has(nameKey(name)));
}

/**
 * Adds a couple, or returns `null` when it is not allowed: both partners
 * must be on the list, be different people, and not already be in a couple.
 */
export function addCouple(
	couples: readonly Couple[],
	participants: readonly string[],
	first: string,
	second: string,
): Couple[] | null {
	const available = new Set(unpairedPeople(participants, couples).map(nameKey));
	const isAllowed =
		nameKey(first) !== nameKey(second) &&
		available.has(nameKey(first)) &&
		available.has(nameKey(second));
	return isAllowed ? [...couples, [first, second]] : null;
}

/** Drops couples that lost a partner when someone left the list. */
export function pruneCouples(
	couples: readonly Couple[],
	participants: readonly string[],
): Couple[] {
	const listed = new Set(participants.map(nameKey));
	return couples.filter((couple) =>
		couple.every((partner) => listed.has(nameKey(partner))),
	);
}
