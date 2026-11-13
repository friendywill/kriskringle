import { describe, expect, it } from "vitest";
import {
	addParticipants,
	cleanName,
	createRng,
	nameKey,
	shuffle,
} from "./utils";

describe("cleanName", () => {
	it("trims and collapses whitespace", () => {
		expect(cleanName("  Mary   Anne\t Smith ")).toBe("Mary Anne Smith");
	});
});

describe("nameKey", () => {
	it("matches names that differ only by case or spacing", () => {
		expect(nameKey("  ALICE  Smith")).toBe(nameKey("alice smith"));
	});

	it("matches composed and decomposed accents", () => {
		expect(nameKey("Zoë")).toBe(nameKey("Zoë"));
	});

	it("keeps different names apart", () => {
		expect(nameKey("Alice")).not.toBe(nameKey("Alicia"));
	});
});

describe("addParticipants", () => {
	it("adds a single name", () => {
		expect(addParticipants(["Alice"], "Bob")).toEqual({
			participants: ["Alice", "Bob"],
			skipped: [],
		});
	});

	it("adds several comma-separated names, tidying each", () => {
		expect(addParticipants([], " Alice ,Bob,,  Carol   Ann ")).toEqual({
			participants: ["Alice", "Bob", "Carol Ann"],
			skipped: [],
		});
	});

	it("skips names already on the list, ignoring case", () => {
		expect(addParticipants(["Alice"], "alice, Bob, BOB")).toEqual({
			participants: ["Alice", "Bob"],
			skipped: ["alice", "BOB"],
		});
	});

	it("skips names that are too long", () => {
		const long = "x".repeat(61);

		expect(addParticipants([], `${long}, Bob`)).toEqual({
			participants: ["Bob"],
			skipped: [long],
		});
	});

	it("adds nothing for blank input and leaves the original untouched", () => {
		const existing = ["Alice"];

		expect(addParticipants(existing, "  , ")).toEqual({
			participants: ["Alice"],
			skipped: [],
		});
		expect(existing).toEqual(["Alice"]);
	});
});

describe("createRng", () => {
	it("produces the same sequence for the same seed", () => {
		const a = createRng(123);
		const b = createRng(123);

		expect([a(), a(), a()]).toEqual([b(), b(), b()]);
	});

	it("produces different sequences for different seeds", () => {
		expect(createRng(1)()).not.toBe(createRng(2)());
	});

	it("stays within [0, 1)", () => {
		const rng = createRng(987654321);

		for (let i = 0; i < 1000; i++) {
			const value = rng();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});
});

describe("shuffle", () => {
	const items = ["a", "b", "c", "d", "e", "f"];

	it("keeps every item exactly once and leaves the input untouched", () => {
		const copy = [...items];

		const shuffled = shuffle(items, createRng(7));

		expect([...shuffled].sort()).toEqual(copy);
		expect(items).toEqual(copy);
	});

	it("is deterministic for a given RNG sequence", () => {
		expect(shuffle(items, createRng(7))).toEqual(shuffle(items, createRng(7)));
	});

	it("produces different orders for different seeds", () => {
		const orders = new Set(
			[1, 2, 3, 4, 5].map((seed) => shuffle(items, createRng(seed)).join("")),
		);

		expect(orders.size).toBeGreaterThan(1);
	});

	it("survives an RNG that wrongly returns 1", () => {
		expect(shuffle(items, () => 1).sort()).toEqual(items);
	});
});
