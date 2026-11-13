import { describe, expect, it } from "vitest";
import { couplesSchema } from "./couples";
import { historyEntrySchema, historySchema, yearSchema } from "./history";
import { nameSchema, participantsSchema } from "./participants";

describe("nameSchema", () => {
	it("trims surrounding whitespace", () => {
		expect(nameSchema.parse("  Alice ")).toBe("Alice");
	});

	it.each([
		["empty", ""],
		["blank", "   "],
		["too long", "x".repeat(61)],
		["not text", 42],
	])("rejects a name that is %s", (_, value) => {
		expect(nameSchema.safeParse(value).success).toBe(false);
	});

	it("accepts a name at the length limit", () => {
		expect(nameSchema.safeParse("x".repeat(60)).success).toBe(true);
	});
});

describe("participantsSchema", () => {
	it("accepts a list of names, including an empty one", () => {
		expect(participantsSchema.parse(["Alice", "Bob"])).toEqual([
			"Alice",
			"Bob",
		]);
		expect(participantsSchema.parse([])).toEqual([]);
	});

	it("rejects a list containing an invalid name", () => {
		expect(participantsSchema.safeParse(["Alice", ""]).success).toBe(false);
	});
});

describe("yearSchema", () => {
	it.each([1900, 2026, 2099])("accepts %i", (year) => {
		expect(yearSchema.safeParse(year).success).toBe(true);
	});

	it.each([1899, 2100, 2025.5, Number.NaN, "2025"])("rejects %j", (year) => {
		expect(yearSchema.safeParse(year).success).toBe(false);
	});
});

describe("historyEntrySchema", () => {
	it("accepts a complete entry and drops unknown fields", () => {
		const stored = { year: 2025, giver: "Alice", receiver: "Bob", extra: 1 };

		expect(historyEntrySchema.parse(stored)).toEqual({
			year: 2025,
			giver: "Alice",
			receiver: "Bob",
		});
	});

	it("rejects an entry without a year", () => {
		const stored = { giver: "Alice", receiver: "Bob" };

		expect(historyEntrySchema.safeParse(stored).success).toBe(false);
	});
});

describe("historySchema", () => {
	it("rejects the whole list when one entry is invalid", () => {
		const stored = [
			{ year: 2025, giver: "Alice", receiver: "Bob" },
			{ year: 2025, giver: "Bob" },
		];

		expect(historySchema.safeParse(stored).success).toBe(false);
	});
});

describe("couplesSchema", () => {
	it("accepts pairs of names, trimming each", () => {
		expect(couplesSchema.parse([[" Alice ", "Bob"]])).toEqual([
			["Alice", "Bob"],
		]);
		expect(couplesSchema.parse([])).toEqual([]);
	});

	it.each([
		["one partner", [["Alice"]]],
		["three partners", [["Alice", "Bob", "Carol"]]],
		["a blank partner", [["Alice", ""]]],
		["an object instead of a pair", [{ first: "Alice", second: "Bob" }]],
	])("rejects a couple with %s", (_, value) => {
		expect(couplesSchema.safeParse(value).success).toBe(false);
	});
});
