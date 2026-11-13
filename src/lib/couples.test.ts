import { describe, expect, it } from "vitest";
import type { Couple } from "../types/couples";
import { addCouple, pruneCouples, unpairedPeople } from "./couples";

const PEOPLE = ["Alice", "Bob", "Carol", "Dan", "Erin"];
const ALICE_AND_BOB: Couple = ["Alice", "Bob"];

describe("unpairedPeople", () => {
	it("returns everyone when there are no couples", () => {
		expect(unpairedPeople(PEOPLE, [])).toEqual(PEOPLE);
	});

	it("leaves out both partners of every couple", () => {
		const couples: Couple[] = [ALICE_AND_BOB, ["Dan", "Carol"]];

		expect(unpairedPeople(PEOPLE, couples)).toEqual(["Erin"]);
	});

	it("matches names ignoring case and spacing", () => {
		expect(unpairedPeople(PEOPLE, [[" alice", "BOB "]])).toEqual([
			"Carol",
			"Dan",
			"Erin",
		]);
	});
});

describe("addCouple", () => {
	it("adds a couple of two unpaired people", () => {
		expect(addCouple([ALICE_AND_BOB], PEOPLE, "Carol", "Dan")).toEqual([
			ALICE_AND_BOB,
			["Carol", "Dan"],
		]);
	});

	it("leaves the original list untouched", () => {
		const couples = [ALICE_AND_BOB];

		addCouple(couples, PEOPLE, "Carol", "Dan");

		expect(couples).toEqual([ALICE_AND_BOB]);
	});

	it.each([
		["someone paired with themselves", "Carol", "carol"],
		["a first partner who is already in a couple", "Alice", "Carol"],
		["a second partner who is already in a couple", "Carol", "Bob"],
		["the same couple the other way round", "Bob", "Alice"],
		["someone who is not on the list", "Carol", "Zed"],
		["a blank choice", "", "Carol"],
	])("refuses %s", (_, first, second) => {
		expect(addCouple([ALICE_AND_BOB], PEOPLE, first, second)).toBeNull();
	});
});

describe("pruneCouples", () => {
	const couples: Couple[] = [ALICE_AND_BOB, ["Carol", "Dan"]];

	it("keeps couples whose partners are both still listed", () => {
		expect(pruneCouples(couples, PEOPLE)).toEqual(couples);
	});

	it("drops a couple when either partner has left the list", () => {
		const withoutBob = PEOPLE.filter((name) => name !== "Bob");

		expect(pruneCouples(couples, withoutBob)).toEqual([["Carol", "Dan"]]);
	});

	it("drops every couple when the list is empty", () => {
		expect(pruneCouples(couples, [])).toEqual([]);
	});
});
