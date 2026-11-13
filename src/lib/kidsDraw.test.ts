import { describe, expect, it } from "vitest";
import type { Assignment, KidsDrawInput } from "../types/draw";
import type { Family } from "../types/families";
import type { HistoryEntry } from "../types/history";
import { drawKids } from "./kidsDraw";
import { createRng } from "./utils";

const SEEDS = Array.from({ length: 200 }, (_, index) => index + 1);

/** Two households with two parents and two kids each, plus a single aunt. */
const SMITHS: Family = { parents: ["Anna", "Ben"], kids: ["Tom", "Lily"] };
const JONES: Family = { parents: ["Cara", "Dev"], kids: ["Max", "Zoe"] };
const ADULTS = ["Anna", "Ben", "Cara", "Dev", "Erin"];

function draw(
	options: Partial<Omit<KidsDrawInput, "rng">> & { seed?: number },
) {
	return drawKids({
		adults: options.adults ?? ADULTS,
		families: options.families ?? [SMITHS, JONES],
		history: options.history ?? [],
		year: options.year ?? 2026,
		rng: createRng(options.seed ?? 1),
	});
}

type Success = Extract<ReturnType<typeof draw>, { ok: true }>;

function success(result: ReturnType<typeof draw>): Success {
	if (!result.ok) throw new Error(`Draw failed: ${result.reason}`);
	return result;
}

function pairs(assignments: Assignment[]): string[] {
	return assignments.map(({ giver, receiver }) => `${giver}>${receiver}`);
}

/** How many presents each child gets, in name order. */
function loads(assignments: Assignment[]): number[] {
	const counts = new Map<string, number>();
	for (const { receiver } of assignments) {
		counts.set(receiver, (counts.get(receiver) ?? 0) + 1);
	}
	return [...counts.values()].sort();
}

function entry(year: number, giver: string, receiver: string): HistoryEntry {
	return { year, giver, receiver };
}

describe("drawKids", () => {
	it("never gives a parent their own child", () => {
		const own = new Set(["Anna>Tom", "Anna>Lily", "Ben>Tom", "Ben>Lily"]);
		for (const kid of JONES.kids) {
			for (const parent of JONES.parents) own.add(`${parent}>${kid}`);
		}

		for (const seed of SEEDS) {
			const { assignments } = success(draw({ seed }));
			expect(pairs(assignments).filter((pair) => own.has(pair))).toEqual([]);
		}
	});

	it("gives every adult one child and every child a present", () => {
		for (const seed of SEEDS.slice(0, 50)) {
			const result = success(draw({ seed }));

			expect(result.assignments.map((a) => a.giver)).toEqual(ADULTS);
			expect(new Set(result.assignments.map((a) => a.receiver)).size).toBe(4);
			expect(result.kidsWithoutPresent).toEqual([]);
			expect(result.adultsWithoutKid).toEqual([]);
		}
	});

	it("spreads presents evenly when there are more adults than kids", () => {
		const families: Family[] = [
			{ parents: ["Anna", "Ben"], kids: ["Tom"] },
			{ parents: ["Cara", "Dev"], kids: ["Max"] },
		];
		const adults = ["Anna", "Ben", "Cara", "Dev", "Erin", "Finn"];

		for (const seed of SEEDS.slice(0, 50)) {
			const { assignments } = success(draw({ adults, families, seed }));
			expect(loads(assignments)).toEqual([3, 3]);
		}
	});

	it("reports kids left out when there are fewer adults than kids", () => {
		const families: Family[] = [{ parents: [], kids: ["Tom", "Lily", "Max"] }];

		const result = success(draw({ adults: ["Anna", "Ben"], families }));

		expect(result.assignments).toHaveLength(2);
		expect(loads(result.assignments)).toEqual([1, 1]);
		expect(result.kidsWithoutPresent).toHaveLength(1);
	});

	it("reports a child whose only adults are their parents", () => {
		const families: Family[] = [{ parents: ["Anna", "Ben"], kids: ["Tom"] }];

		const result = success(draw({ adults: ["Anna", "Ben"], families }));

		expect(result.assignments).toEqual([]);
		expect(result.kidsWithoutPresent).toEqual(["Tom"]);
		expect(result.adultsWithoutKid).toEqual(["Anna", "Ben"]);
	});

	it("reaches every child it can before giving anyone a second present", () => {
		// Erin is the only adult who may buy for the Smith kids, and the
		// Smith parents may only buy for Max: a greedy pick could leave Lily
		// or Tom out while Max gets several.
		const families: Family[] = [
			{ parents: ["Anna", "Ben", "Cara", "Dev"], kids: ["Tom"] },
			{ parents: [], kids: ["Max"] },
		];

		for (const seed of SEEDS.slice(0, 50)) {
			const result = success(draw({ families, seed }));
			expect(result.kidsWithoutPresent).toEqual([]);
			expect(result.assignments.find((a) => a.receiver === "Tom")?.giver).toBe(
				"Erin",
			);
		}
	});

	it("is deterministic for a given seed", () => {
		expect(draw({ seed: 42 })).toEqual(draw({ seed: 42 }));
	});

	it("matches parents and kids ignoring case and spacing", () => {
		const families: Family[] = [{ parents: [" ANNA "], kids: ["tom"] }];

		const result = success(draw({ adults: ["Anna"], families }));

		expect(result.assignments).toEqual([]);
		expect(result.adultsWithoutKid).toEqual(["Anna"]);
	});

	it("treats a child listed in two families as one child with both sets of parents", () => {
		const families: Family[] = [
			{ parents: ["Anna"], kids: ["Tom"] },
			{ parents: ["Ben"], kids: ["tom"] },
		];

		const result = success(draw({ adults: ["Anna", "Ben", "Cara"], families }));

		expect(pairs(result.assignments)).toEqual(["Cara>Tom"]);
		expect(result.adultsWithoutKid).toEqual(["Anna", "Ben"]);
	});

	describe("past years", () => {
		it("avoids a child an adult bought for before when it can", () => {
			const history = [
				entry(2025, "Anna", "Max"),
				entry(2025, "Ben", "Zoe"),
				entry(2025, "Cara", "Tom"),
				entry(2025, "Dev", "Lily"),
			];

			for (const seed of SEEDS) {
				const result = success(draw({ history, seed }));
				expect(result.repeats).toEqual([]);
				expect(result.kidsWithoutPresent).toEqual([]);
			}
		});

		it("repeats a child rather than leave a child without a present", () => {
			// Anna's only option is Max, whom she bought for last year.
			const families: Family[] = [
				{ parents: ["Anna"], kids: ["Tom"] },
				{ parents: [], kids: ["Max"] },
			];
			const history = [entry(2025, "Anna", "Max")];

			const result = success(
				draw({ adults: ["Anna", "Ben"], families, history }),
			);

			expect(pairs(result.assignments)).toEqual(["Anna>Max", "Ben>Tom"]);
			expect(result.repeats).toEqual([{ giver: "Anna", receiver: "Max" }]);
		});

		it("repeats a child rather than leave an adult without one", () => {
			const families: Family[] = [{ parents: [], kids: ["Tom"] }];
			const history = [entry(2025, "Anna", "Tom")];

			const result = success(draw({ adults: ["Anna"], families, history }));

			expect(pairs(result.assignments)).toEqual(["Anna>Tom"]);
			expect(result.repeats).toHaveLength(1);
		});

		it("ignores the year being drawn and later years", () => {
			const families: Family[] = [{ parents: [], kids: ["Tom", "Max"] }];
			const history = [entry(2026, "Anna", "Tom"), entry(2027, "Anna", "Max")];

			const result = success(draw({ adults: ["Anna"], families, history }));

			expect(result.repeats).toEqual([]);
		});
	});

	describe("nothing to draw", () => {
		it("needs at least one child", () => {
			expect(draw({ families: [] })).toEqual({ ok: false, reason: "no-kids" });
			expect(draw({ families: [{ parents: ["Anna"], kids: [] }] })).toEqual({
				ok: false,
				reason: "no-kids",
			});
		});

		it("needs at least one adult", () => {
			expect(draw({ adults: [] })).toEqual({ ok: false, reason: "no-adults" });
		});
	});
});
