import type { KidsDrawInput, KidsDrawResult } from "../types/draw";
import { nameKey, shuffle } from "./utils";

function pairKey(giver: string, receiver: string): string {
	return `${nameKey(giver)}\u0000${nameKey(receiver)}`;
}

/**
 * Gives each adult one child from their `options`, spreading presents as
 * evenly as the options allow. Returns adult -> child; adults with no
 * options are left out.
 *
 * Each child has present "slots" in tiers: tier 0 is their first present,
 * tier 1 their second, and so on. Matching starts with one tier, which
 * reaches as many different children as possible, and opens another tier
 * only when an adult cannot be placed otherwise. Kuhn's augmenting paths
 * never unfill a slot, so children covered early stay covered and no child
 * gets a second present while a re-shuffle could give someone else a first.
 */
function assignKids(
	adults: readonly string[],
	options: ReadonlyMap<string, readonly string[]>,
): Map<string, string> {
	const kidOf = new Map<string, string>();
	const slotOwner = new Map<string, string>();
	const givers = adults.filter(
		(adult) => (options.get(adult) ?? []).length > 0,
	);

	const place = (adult: string, tiers: number, tried: Set<string>): boolean => {
		for (let tier = 0; tier < tiers; tier++) {
			for (const kid of options.get(adult) ?? []) {
				const slot = `${tier}\u0000${nameKey(kid)}`;
				if (tried.has(slot)) continue;
				tried.add(slot);
				const current = slotOwner.get(slot);
				if (current === undefined || place(current, tiers, tried)) {
					slotOwner.set(slot, adult);
					kidOf.set(adult, kid);
					return true;
				}
			}
		}
		return false;
	};

	// With as many tiers as givers, every giver fits, so this always ends.
	for (let tiers = 1; tiers <= givers.length; tiers++) {
		for (const adult of givers) {
			if (!kidOf.has(adult)) place(adult, tiers, new Set());
		}
		if (kidOf.size === givers.length) break;
	}
	return kidOf;
}

/** Most presents any one child gets. */
function maxLoad(kidOf: ReadonlyMap<string, string>): number {
	const counts = new Map<string, number>();
	for (const kid of kidOf.values()) {
		counts.set(nameKey(kid), (counts.get(nameKey(kid)) ?? 0) + 1);
	}
	return Math.max(0, ...counts.values());
}

function kidsCovered(kidOf: ReadonlyMap<string, string>): number {
	return new Set([...kidOf.values()].map(nameKey)).size;
}

/**
 * Draws which child each adult buys for. Hard rule: never a parent's own
 * child. Then, in order of importance: every child gets a present if there
 * are enough adults; presents are spread as evenly as possible; and nobody
 * buys for a child they bought for in an earlier year, unless the only way
 * to keep the first two is to repeat.
 *
 * Pure and deterministic given the input and RNG sequence.
 */
export function drawKids({
	adults,
	families,
	history,
	year,
	rng,
}: KidsDrawInput): KidsDrawResult {
	// A child listed in two families counts once, with both sets of parents.
	const parentsOf = new Map<string, Set<string>>();
	const kids: string[] = [];
	for (const family of families) {
		for (const kid of family.kids) {
			const parents = parentsOf.get(nameKey(kid)) ?? new Set<string>();
			if (!parentsOf.has(nameKey(kid))) kids.push(kid);
			for (const parent of family.parents) parents.add(nameKey(parent));
			parentsOf.set(nameKey(kid), parents);
		}
	}
	if (kids.length === 0) return { ok: false, reason: "no-kids" };
	if (adults.length === 0) return { ok: false, reason: "no-adults" };

	const past = new Set(
		history
			.filter((entry) => entry.year < year)
			.map((entry) => pairKey(entry.giver, entry.receiver)),
	);
	const isRepeat = (adult: string, kid: string) =>
		past.has(pairKey(adult, kid));
	const isOwnChild = (adult: string, kid: string) =>
		parentsOf.get(nameKey(kid))?.has(nameKey(adult)) ?? false;

	const kidOrder = shuffle(kids, rng);
	const giverOrder = shuffle(adults, rng);

	const freshOnly = new Map<string, string[]>();
	const freshFirst = new Map<string, string[]>();
	for (const adult of adults) {
		const allowed = kidOrder.filter((kid) => !isOwnChild(adult, kid));
		const fresh = allowed.filter((kid) => !isRepeat(adult, kid));
		freshOnly.set(adult, fresh);
		freshFirst.set(adult, [
			...fresh,
			...allowed.filter((kid) => isRepeat(adult, kid)),
		]);
	}

	// Avoiding repeats is a preference: keep the no-repeat draw only when it
	// places as many adults, reaches as many children and is as even.
	const strict = assignKids(giverOrder, freshOnly);
	const relaxed = assignKids(giverOrder, freshFirst);
	const chosen =
		strict.size === relaxed.size &&
		kidsCovered(strict) === kidsCovered(relaxed) &&
		maxLoad(strict) <= maxLoad(relaxed)
			? strict
			: relaxed;

	const assignments = adults.flatMap((giver) => {
		const receiver = chosen.get(giver);
		return receiver === undefined ? [] : [{ giver, receiver }];
	});
	const covered = new Set([...chosen.values()].map(nameKey));

	return {
		ok: true,
		assignments,
		kidsWithoutPresent: kids.filter((kid) => !covered.has(nameKey(kid))),
		adultsWithoutKid: adults.filter((adult) => !chosen.has(adult)),
		repeats: assignments.filter(({ giver, receiver }) =>
			isRepeat(giver, receiver),
		),
	};
}
