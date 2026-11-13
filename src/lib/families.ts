import type { AddKidsResult, Family } from "../types/families";
import { addParticipants, nameKey } from "./utils";

/** Every child across all families, in family order. */
export function allKids(families: readonly Family[]): string[] {
	return families.flatMap((family) => family.kids);
}

function updateFamily(
	families: readonly Family[],
	index: number,
	change: (family: Family) => Family,
): Family[] {
	return families.map((family, position) =>
		position === index ? change(family) : family,
	);
}

/**
 * Reads comma-separated kids' names, skipping any child who is already in a
 * family (a child belongs to exactly one) or whose name is not valid.
 */
function readNewKids(
	families: readonly Family[],
	input: string,
): { kids: string[]; skipped: string[] } {
	const existing = allKids(families);
	const { participants, skipped } = addParticipants(existing, input);
	return { kids: participants.slice(existing.length), skipped };
}

/** Starts a new family from its children; parents are added afterwards. */
export function addFamily(
	families: readonly Family[],
	kidsInput: string,
): AddKidsResult {
	const { kids, skipped } = readNewKids(families, kidsInput);
	if (kids.length === 0) return { families: [...families], skipped };
	return { families: [...families, { parents: [], kids }], skipped };
}

/** Adds children to the family at `index`. */
export function addKids(
	families: readonly Family[],
	index: number,
	kidsInput: string,
): AddKidsResult {
	const { kids, skipped } = readNewKids(families, kidsInput);
	return {
		families: updateFamily(families, index, (family) => ({
			...family,
			kids: [...family.kids, ...kids],
		})),
		skipped,
	};
}

export function removeKid(
	families: readonly Family[],
	index: number,
	kid: string,
): Family[] {
	return updateFamily(families, index, (family) => ({
		...family,
		kids: family.kids.filter((name) => nameKey(name) !== nameKey(kid)),
	}));
}

/** Adds a parent to the family at `index`, unless already one of them. */
export function addParent(
	families: readonly Family[],
	index: number,
	parent: string,
): Family[] {
	return updateFamily(families, index, (family) =>
		family.parents.some((name) => nameKey(name) === nameKey(parent))
			? family
			: { ...family, parents: [...family.parents, parent] },
	);
}

export function removeParent(
	families: readonly Family[],
	index: number,
	parent: string,
): Family[] {
	return updateFamily(families, index, (family) => ({
		...family,
		parents: family.parents.filter((name) => nameKey(name) !== nameKey(parent)),
	}));
}

export function removeFamily(
	families: readonly Family[],
	index: number,
): Family[] {
	return families.filter((_, position) => position !== index);
}

/**
 * Drops parents who are no longer on the people list. The family and its
 * children stay: other adults can still buy for them.
 */
export function pruneParents(
	families: readonly Family[],
	participants: readonly string[],
): Family[] {
	const listed = new Set(participants.map(nameKey));
	return families.map((family) => ({
		...family,
		parents: family.parents.filter((name) => listed.has(nameKey(name))),
	}));
}
