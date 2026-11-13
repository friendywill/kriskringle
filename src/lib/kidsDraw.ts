import type { Couple } from "../types/couples";
import type { KidsDrawInput, KidsDrawResult } from "../types/draw";
import { nameKey, shuffle } from "./utils";

function pairKey(giver: string, receiver: string): string {
	return `${nameKey(giver)}\u0000${nameKey(receiver)}`;
}

/** A residual-graph edge. `reverse` indexes the paired edge at `to`. */
type Edge = { to: number; capacity: number; reverse: number };

const SOURCE = 0;
const SINK = 1;

/**
 * Gives each adult one child from their `options`, as a max flow:
 *
 *   source → adult → gate (household, child) → child → sink
 *
 * Every edge into a gate carries one present, and a couple shares one gate
 * per child, so partners never buy for the same child. A child's edge to
 * the sink is how many presents they may get. It starts at 1, which reaches
 * as many different children as possible, and grows one at a time only
 * while adults are still unplaced. Augmenting paths never pass through the
 * sink, so a child who has a present keeps one: nobody gets a second
 * present while a re-shuffle could give someone else a first.
 *
 * Edges are tried in `options` order, so earlier options are preferred.
 * Returns adult -> child; adults who cannot be placed are left out.
 */
function assignKids(
	givers: readonly string[],
	options: ReadonlyMap<string, readonly string[]>,
	householdOf: (adult: string) => string,
): Map<string, string> {
	const graph: Edge[][] = [[], []];
	const edgesAt = (node: number): Edge[] => {
		const edges = graph[node];
		if (edges === undefined) throw new Error(`No node ${node} in graph`);
		return edges;
	};
	const addNode = (): number => graph.push([]) - 1;
	const addEdge = (from: number, to: number, capacity: number): Edge => {
		const forward = { to, capacity, reverse: edgesAt(to).length };
		edgesAt(to).push({ to: from, capacity: 0, reverse: edgesAt(from).length });
		edgesAt(from).push(forward);
		return forward;
	};

	const kidNodes = new Map<string, number>();
	const gateNodes = new Map<string, number>();
	const kidAtGate = new Map<number, string>();
	const sinkEdges: Edge[] = [];
	const giverEdges = new Map<string, Edge[]>();

	for (const adult of givers) {
		const adultNode = addNode();
		addEdge(SOURCE, adultNode, 1);
		const edges: Edge[] = [];
		for (const kid of options.get(adult) ?? []) {
			let kidNode = kidNodes.get(nameKey(kid));
			if (kidNode === undefined) {
				kidNode = addNode();
				kidNodes.set(nameKey(kid), kidNode);
				sinkEdges.push(addEdge(kidNode, SINK, 0));
			}
			const gateKey = `${householdOf(adult)}\u0000${nameKey(kid)}`;
			let gate = gateNodes.get(gateKey);
			if (gate === undefined) {
				gate = addNode();
				gateNodes.set(gateKey, gate);
				kidAtGate.set(gate, kid);
				addEdge(gate, kidNode, 1);
			}
			edges.push(addEdge(adultNode, gate, 1));
		}
		giverEdges.set(adult, edges);
	}

	const augment = (node: number, seen: Set<number>): boolean => {
		if (node === SINK) return true;
		seen.add(node);
		for (const edge of edgesAt(node)) {
			if (edge.capacity <= 0 || seen.has(edge.to)) continue;
			if (augment(edge.to, seen)) {
				edge.capacity -= 1;
				const back = edgesAt(edge.to)[edge.reverse];
				if (back !== undefined) back.capacity += 1;
				return true;
			}
		}
		return false;
	};

	let placed = 0;
	for (let tier = 1; tier <= givers.length && placed < givers.length; tier++) {
		for (const edge of sinkEdges) edge.capacity += 1;
		while (placed < givers.length && augment(SOURCE, new Set())) placed += 1;
	}

	// A used adult -> gate edge has spent its single unit of capacity.
	const kidOf = new Map<string, string>();
	for (const [adult, edges] of giverEdges) {
		const used = edges.find((edge) => edge.capacity === 0);
		const kid = used === undefined ? undefined : kidAtGate.get(used.to);
		if (kid !== undefined) kidOf.set(adult, kid);
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

/** Couples share a household key; everyone else is their own household. */
function households(couples: readonly Couple[]): (adult: string) => string {
	const household = new Map<string, string>();
	for (const [first, second] of couples) {
		const key = [nameKey(first), nameKey(second)].sort().join("\u0000");
		household.set(nameKey(first), key);
		household.set(nameKey(second), key);
	}
	return (adult) => household.get(nameKey(adult)) ?? nameKey(adult);
}

/**
 * Draws which child each adult buys for. Hard rules: never a parent's own
 * child, and never the same child as their partner. Then, in order of
 * importance: every child gets a present if there are enough adults;
 * presents are spread as evenly as possible; and nobody buys for a child
 * they bought for in an earlier year, unless the only way to keep the
 * first two is to repeat.
 *
 * Pure and deterministic given the input and RNG sequence.
 */
export function drawKids({
	adults,
	families,
	couples,
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
	const householdOf = households(couples);

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
	const strict = assignKids(giverOrder, freshOnly, householdOf);
	const relaxed = assignKids(giverOrder, freshFirst, householdOf);
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
