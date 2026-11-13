import { describe, expect, it } from "vitest";
import type { Family } from "../types/families";
import {
	addFamily,
	addKids,
	addParent,
	allKids,
	familyLabel,
	pruneParents,
	removeFamily,
	removeKid,
	removeParent,
} from "./families";

const SMITHS: Family = { parents: ["Anna", "Ben"], kids: ["Tom", "Lily"] };
const JONES: Family = { parents: ["Cara"], kids: ["Max"] };

describe("allKids", () => {
	it("lists every child in family order", () => {
		expect(allKids([SMITHS, JONES])).toEqual(["Tom", "Lily", "Max"]);
	});
});

describe("addFamily", () => {
	it("starts a family from comma-separated kids, with no parents yet", () => {
		expect(addFamily([SMITHS], " Max ,  Zoe Ann ")).toEqual({
			families: [SMITHS, { parents: [], kids: ["Max", "Zoe Ann"] }],
			skipped: [],
		});
	});

	it("skips a child who is already in a family, ignoring case", () => {
		expect(addFamily([SMITHS], "tom, Max")).toEqual({
			families: [SMITHS, { parents: [], kids: ["Max"] }],
			skipped: ["tom"],
		});
	});

	it("adds no family when no new child was given", () => {
		expect(addFamily([SMITHS], "Tom, ")).toEqual({
			families: [SMITHS],
			skipped: ["Tom"],
		});
	});
});

describe("addKids", () => {
	it("adds kids to one family only", () => {
		expect(addKids([SMITHS, JONES], 1, "Zoe")).toEqual({
			families: [SMITHS, { parents: ["Cara"], kids: ["Max", "Zoe"] }],
			skipped: [],
		});
	});

	it("skips a child already in any family", () => {
		expect(addKids([SMITHS, JONES], 1, "Lily").skipped).toEqual(["Lily"]);
	});
});

describe("removeKid", () => {
	it("removes the child from that family", () => {
		expect(removeKid([SMITHS], 0, "tom")).toEqual([
			{ parents: ["Anna", "Ben"], kids: ["Lily"] },
		]);
	});

	it("removes the family along with its last child", () => {
		expect(removeKid([SMITHS, JONES], 1, "Max")).toEqual([SMITHS]);
	});
});

describe("addParent", () => {
	it("adds a parent to one family", () => {
		expect(addParent([SMITHS, JONES], 1, "Dev")).toEqual([
			SMITHS,
			{ parents: ["Cara", "Dev"], kids: ["Max"] },
		]);
	});

	it("does not add the same parent twice", () => {
		expect(addParent([SMITHS], 0, "anna")).toEqual([SMITHS]);
	});

	it("allows one adult to be a parent in two families", () => {
		expect(addParent([SMITHS, JONES], 1, "Anna")[1]?.parents).toEqual([
			"Cara",
			"Anna",
		]);
	});
});

describe("removeParent", () => {
	it("removes the parent from that family only", () => {
		const both = addParent([SMITHS, JONES], 1, "Anna");

		expect(removeParent(both, 0, "Anna")).toEqual([
			{ parents: ["Ben"], kids: ["Tom", "Lily"] },
			{ parents: ["Cara", "Anna"], kids: ["Max"] },
		]);
	});
});

describe("removeFamily", () => {
	it("removes the family at the index", () => {
		expect(removeFamily([SMITHS, JONES], 0)).toEqual([JONES]);
	});
});

describe("pruneParents", () => {
	it("drops parents who left the people list but keeps their kids", () => {
		expect(pruneParents([SMITHS, JONES], ["Ben"])).toEqual([
			{ parents: ["Ben"], kids: ["Tom", "Lily"] },
			{ parents: [], kids: ["Max"] },
		]);
	});
});

describe("familyLabel", () => {
	it("names a family by its kids", () => {
		expect(familyLabel(SMITHS)).toBe("Family of Tom, Lily");
	});

	it("handles a family with no kids", () => {
		expect(familyLabel({ parents: ["Anna"], kids: [] })).toBe(
			"Family with no kids",
		);
	});
});
