import { describe, expect, it } from "vitest";
import type { Family } from "../types/families";
import {
	addFamily,
	addKids,
	addParent,
	allKids,
	familyLabel,
	parentsWithoutKids,
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

	it("starts a family from a parent alone, for adults with no kids yet", () => {
		expect(addFamily([SMITHS], "", "Erin")).toEqual({
			families: [SMITHS, { parents: ["Erin"], kids: [] }],
			skipped: [],
		});
	});

	it("starts a family from a parent and kids together", () => {
		expect(addFamily([], "Max", "Cara").families).toEqual([
			{ parents: ["Cara"], kids: ["Max"] },
		]);
	});

	it("does not start a second family with no kids for the same adult", () => {
		const waiting: Family[] = [{ parents: ["Erin", "Finn"], kids: [] }];

		expect(addFamily(waiting, "", "finn").families).toEqual(waiting);
		expect(addFamily(waiting, "Ivy", "Finn").families).toHaveLength(2);
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

	it("keeps a family with parents after its last child is removed", () => {
		expect(removeKid([SMITHS, JONES], 1, "Max")).toEqual([
			SMITHS,
			{ parents: ["Cara"], kids: [] },
		]);
	});

	it("removes a family left with nobody", () => {
		const orphans: Family[] = [{ parents: [], kids: ["Max"] }];

		expect(removeKid(orphans, 0, "Max")).toEqual([]);
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

describe("removeParent on a family with no kids", () => {
	it("removes the family once its last parent goes", () => {
		const waiting: Family[] = [{ parents: ["Erin"], kids: [] }];

		expect(removeParent(waiting, 0, "Erin")).toEqual([]);
	});
});

describe("parentsWithoutKids", () => {
	it("lists adults heading a family with no kids yet", () => {
		const waiting: Family = { parents: ["Erin", "Finn"], kids: [] };

		expect(parentsWithoutKids([SMITHS, waiting])).toEqual(["Erin", "Finn"]);
	});
});

describe("removeFamily", () => {
	it("removes the family at the index", () => {
		expect(removeFamily([SMITHS, JONES], 0)).toEqual([JONES]);
	});
});

describe("pruneParents", () => {
	it("removes a family with no kids once all its parents have left", () => {
		const waiting: Family = { parents: ["Erin"], kids: [] };

		expect(pruneParents([SMITHS, waiting], ["Anna", "Ben"])).toEqual([SMITHS]);
	});

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

	it("names a family with no kids yet by its parents", () => {
		expect(familyLabel({ parents: ["Erin", "Finn"], kids: [] })).toBe(
			"Erin & Finn (no kids yet)",
		);
	});

	it("handles an empty family", () => {
		expect(familyLabel({ parents: [], kids: [] })).toBe("Empty family");
	});
});
