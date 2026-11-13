import type { AddKidsResult, Family } from "../types/families";
import { addParticipants, nameKey } from "./utils";

/**
 * A family's display name, built from its members so no extra naming is
 * needed: by its kids, or by its parents while it has no kids yet.
 */
export function familyLabel(family: Family): string {
	if (family.kids.length > 0) return `Family of ${family.kids.join(", ")}`;
	if (family.parents.length > 0) {
		return `${family.parents.join(" & ")} (no kids yet)`;
	}
	return "Empty family";
}

/** A family that has neither kids nor parents left serves no purpose. */
function isEmpty(family: Family): boolean {
	return family.kids.length === 0 && family.parents.length === 0;
}

/** Every child across all families, in family order. */
export function allKids(families: readonly Family[]): string[] {
	return families.flatMap((family) => family.kids);
}

/**
 * Adults who already head a family with no kids yet. They add kids to that
 * family rather than start another empty one.
 */
export function parentsWithoutKids(families: readonly Family[]): string[] {
	return families
		.filter((family) => family.kids.length === 0)
		.flatMap((family) => family.parents);
}

function updateFamily(
	families: readonly Family[],
	index: number,
	change: (family: Family) => Family,
): Family[] {
	return families
		.map((family, position) => (position === index ? change(family) : family))
		.filter((family, position) => position !== index || !isEmpty(family));
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

/**
 * Starts a new family from its kids, a parent, or both. A family may start
 * with adults only (kids can come later), but an adult can head only one
 * family with no kids yet. Adds nothing when there is no one to add.
 */
export function addFamily(
	families: readonly Family[],
	kidsInput: string,
	parent = "",
): AddKidsResult {
	const { kids, skipped } = readNewKids(families, kidsInput);
	const parents = parent.trim() === "" ? [] : [parent];
	const isDuplicateEmpty =
		kids.length === 0 &&
		parentsWithoutKids(families).some(
			(name) => nameKey(name) === nameKey(parent),
		);
	if (isEmpty({ parents, kids }) || isDuplicateEmpty) {
		return { families: [...families], skipped };
	}
	return { families: [...families, { parents, kids }], skipped };
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

/**
 * Removes a child. The family stays while it still has parents, waiting for
 * kids; a family left with nobody is removed.
 */
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

/** Removes a parent; a family left with nobody is removed. */
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
 * Drops parents who are no longer on the people list. Their kids stay, as
 * other adults can still buy for them; a family left with nobody goes.
 */
export function pruneParents(
	families: readonly Family[],
	participants: readonly string[],
): Family[] {
	const listed = new Set(participants.map(nameKey));
	return families
		.map((family) => ({
			...family,
			parents: family.parents.filter((name) => listed.has(nameKey(name))),
		}))
		.filter((family) => !isEmpty(family));
}
