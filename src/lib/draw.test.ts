import { describe, expect, it } from "vitest";
import type { Couple } from "../types/couples";
import type { Assignment, DrawInput } from "../types/draw";
import type { HistoryEntry } from "../types/history";
import { drawAssignments } from "./draw";
import { createRng } from "./utils";

const SEEDS = Array.from({ length: 200 }, (_, index) => index + 1);

function draw(
	participants: string[],
	options: Partial<Omit<DrawInput, "participants" | "rng">> & {
		seed?: number;
	} = {},
) {
	return drawAssignments({
		participants,
		history: options.history ?? [],
		couples: options.couples ?? [],
		year: options.year ?? 2026,
		lookbackYears: options.lookbackYears ?? null,
		rng: createRng(options.seed ?? 1),
	});
}

/** Unwraps a successful draw, failing the test if it was not one. */
function assignmentsOf(result: ReturnType<typeof draw>): Assignment[] {
	if (!result.ok) throw new Error(`Draw failed: ${result.reason}`);
	return result.assignments;
}

function pairs(assignments: Assignment[]): string[] {
	return assignments.map(({ giver, receiver }) => `${giver}>${receiver}`);
}

function entry(year: number, giver: string, receiver: string): HistoryEntry {
	return { year, giver, receiver };
}

describe("drawAssignments", () => {
	it.each([2, 3, 4, 5, 8, 13])(
		"gives every one of %i people one gift to give and one to receive",
		(size) => {
			const people = Array.from({ length: size }, (_, i) => `Person ${i + 1}`);

			for (const seed of SEEDS.slice(0, 50)) {
				const assignments = assignmentsOf(draw(people, { seed }));

				expect(assignments.map((a) => a.giver)).toEqual(people);
				expect(assignments.map((a) => a.receiver).sort()).toEqual(
					[...people].sort(),
				);
				for (const { giver, receiver } of assignments) {
					expect(receiver).not.toBe(giver);
				}
			}
		},
	);

	it("returns the same draw for the same seed", () => {
		const people = ["Alice", "Bob", "Carol", "Dan", "Erin", "Frank"];

		expect(draw(people, { seed: 42 })).toEqual(draw(people, { seed: 42 }));
	});

	it("can reach every valid arrangement across seeds", () => {
		const people = ["Alice", "Bob", "Carol", "Dan"];

		const seen = new Set(
			SEEDS.map((seed) => pairs(assignmentsOf(draw(people, { seed }))).join()),
		);

		// Four people can be arranged with nobody drawing themselves 9 ways.
		expect(seen.size).toBe(9);
	});

	describe("rotation rule", () => {
		const people = ["Alice", "Bob", "Carol", "Dan", "Erin"];
		const history = [
			entry(2025, "Alice", "Bob"),
			entry(2025, "Bob", "Carol"),
			entry(2025, "Carol", "Dan"),
			entry(2025, "Dan", "Erin"),
			entry(2025, "Erin", "Alice"),
			entry(2024, "Alice", "Carol"),
			entry(2024, "Bob", "Dan"),
			entry(2024, "Carol", "Erin"),
			entry(2024, "Dan", "Alice"),
			entry(2024, "Erin", "Bob"),
		];

		it("never repeats a pairing from an earlier year", () => {
			const past = new Set(history.map((e) => `${e.giver}>${e.receiver}`));

			for (const seed of SEEDS) {
				const drawn = pairs(assignmentsOf(draw(people, { history, seed })));
				expect(drawn.filter((pair) => past.has(pair))).toEqual([]);
			}
		});

		it("treats names that differ only by case or spacing as one person", () => {
			const messy = [
				entry(2025, "  ALICE ", "bob"),
				entry(2025, "BOB", "alice"),
			];

			const result = draw(["Alice", "Bob"], { history: messy });

			expect(result).toEqual({ ok: false, reason: "no-valid-pairing" });
		});

		it("finds the one arrangement left when history rules out the rest", () => {
			const trio = ["Alice", "Bob", "Carol"];
			const usedCycle = [
				entry(2025, "Alice", "Bob"),
				entry(2025, "Bob", "Carol"),
				entry(2025, "Carol", "Alice"),
			];

			for (const seed of SEEDS) {
				const drawn = assignmentsOf(draw(trio, { history: usedCycle, seed }));
				expect(pairs(drawn)).toEqual(["Alice>Carol", "Bob>Alice", "Carol>Bob"]);
			}
		});

		it("re-homes earlier picks to complete a tightly constrained draw", () => {
			// Alice and Bob may each only give to Carol or Dan, so Carol and Dan
			// must give to Alice and Bob — a greedy pick would get stuck.
			const four = ["Alice", "Bob", "Carol", "Dan"];
			const tight = [
				entry(2025, "Alice", "Bob"),
				entry(2025, "Bob", "Alice"),
				entry(2024, "Carol", "Dan"),
				entry(2024, "Dan", "Carol"),
			];
			const past = new Set(tight.map((e) => `${e.giver}>${e.receiver}`));

			for (const seed of SEEDS) {
				const drawn = pairs(
					assignmentsOf(draw(four, { history: tight, seed })),
				);
				expect(drawn.filter((pair) => past.has(pair))).toEqual([]);
			}
		});

		it("reports when no valid pairing exists", () => {
			const trio = ["Alice", "Bob", "Carol"];
			const everything = [
				entry(2025, "Alice", "Bob"),
				entry(2025, "Bob", "Carol"),
				entry(2025, "Carol", "Alice"),
				entry(2024, "Alice", "Carol"),
				entry(2024, "Bob", "Alice"),
				entry(2024, "Carol", "Bob"),
			];

			for (const seed of SEEDS.slice(0, 20)) {
				expect(draw(trio, { history: everything, seed })).toEqual({
					ok: false,
					reason: "no-valid-pairing",
				});
			}
		});

		it("reports no valid pairing when one person has nobody left", () => {
			const stuck = people
				.filter((name) => name !== "Alice")
				.map((receiver, i) => entry(2020 + i, "Alice", receiver));

			expect(draw(people, { history: stuck })).toEqual({
				ok: false,
				reason: "no-valid-pairing",
			});
		});

		it("only looks back as many years as asked", () => {
			const duo = ["Alice", "Bob"];
			const old = [entry(2023, "Alice", "Bob"), entry(2023, "Bob", "Alice")];

			expect(draw(duo, { history: old, lookbackYears: 3 }).ok).toBe(false);
			expect(draw(duo, { history: old, lookbackYears: 2 }).ok).toBe(true);
			expect(draw(duo, { history: old, lookbackYears: 0 }).ok).toBe(true);
		});

		it("ignores the year being drawn so it can be re-drawn", () => {
			const duo = ["Alice", "Bob"];
			const thisYear = [
				entry(2026, "Alice", "Bob"),
				entry(2026, "Bob", "Alice"),
			];

			expect(draw(duo, { history: thisYear, year: 2026 }).ok).toBe(true);
		});

		it("ignores later years", () => {
			const duo = ["Alice", "Bob"];
			const future = [entry(2027, "Alice", "Bob"), entry(2027, "Bob", "Alice")];

			expect(draw(duo, { history: future, year: 2026 }).ok).toBe(true);
		});

		it("ignores history about people who are not taking part", () => {
			const strangers = [
				entry(2025, "Zed", "Alice"),
				entry(2025, "Bob", "Yan"),
			];

			expect(draw(["Alice", "Bob"], { history: strangers }).ok).toBe(true);
		});
	});

	describe("couples rule", () => {
		const people = ["Alice", "Bob", "Carol", "Dan", "Erin", "Frank"];
		const couples: Couple[] = [
			["Alice", "Bob"],
			["Carol", "Dan"],
		];

		it("never has partners draw each other, in either direction", () => {
			const forbidden = new Set([
				"Alice>Bob",
				"Bob>Alice",
				"Carol>Dan",
				"Dan>Carol",
			]);

			for (const seed of SEEDS) {
				const drawn = pairs(assignmentsOf(draw(people, { couples, seed })));
				expect(drawn.filter((pair) => forbidden.has(pair))).toEqual([]);
				expect(drawn).toHaveLength(people.length);
			}
		});

		it("treats names that differ only by case or spacing as one person", () => {
			const messy: Couple[] = [[" ALICE", "bob "]];

			expect(draw(["Alice", "Bob"], { couples: messy })).toEqual({
				ok: false,
				reason: "no-valid-pairing",
			});
		});

		it("still applies when history is ignored", () => {
			const result = draw(["Alice", "Bob"], {
				couples: [["Alice", "Bob"]],
				lookbackYears: 0,
			});

			expect(result).toEqual({ ok: false, reason: "no-valid-pairing" });
		});

		it("applies together with the rotation rule", () => {
			// Two couples leave each person two possible receivers; last year
			// used one of them, so exactly one arrangement remains.
			const four = ["Alice", "Bob", "Carol", "Dan"];
			const lastYear = [
				entry(2025, "Alice", "Carol"),
				entry(2025, "Carol", "Bob"),
				entry(2025, "Bob", "Dan"),
				entry(2025, "Dan", "Alice"),
			];

			for (const seed of SEEDS.slice(0, 50)) {
				const drawn = assignmentsOf(
					draw(four, { couples, history: lastYear, seed }),
				);
				expect(pairs(drawn)).toEqual([
					"Alice>Dan",
					"Bob>Carol",
					"Carol>Alice",
					"Dan>Bob",
				]);
			}
		});

		it("reports no valid pairing when a couple leaves someone stuck", () => {
			// With three people, whoever draws the single person leaves the
			// other partner nobody but their own partner.
			const result = draw(["Alice", "Bob", "Carol"], {
				couples: [["Alice", "Bob"]],
			});

			expect(result).toEqual({ ok: false, reason: "no-valid-pairing" });
		});

		it("ignores couples involving people who are not taking part", () => {
			const strangers: Couple[] = [
				["Alice", "Zed"],
				["Yan", "Xavier"],
			];

			expect(draw(["Alice", "Bob"], { couples: strangers }).ok).toBe(true);
		});
	});

	describe("invalid input", () => {
		it.each([[[]], [["Alice"]]])(
			"needs at least two people (%j)",
			(participants) => {
				expect(draw(participants)).toEqual({
					ok: false,
					reason: "too-few-participants",
				});
			},
		);

		it("rejects the same person listed twice", () => {
			expect(draw(["Alice", "Bob", "alice "])).toEqual({
				ok: false,
				reason: "duplicate-participants",
			});
		});
	});
});
