import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "../types/history";
import {
	dropErrorLines,
	formatAnnouncement,
	groupByYear,
	parseHistory,
	replaceYear,
	serialiseHistory,
} from "./history";

const PEOPLE = ["Alice", "Bob", "Carol", "Dan", "Erin"];

/** Parses against the usual people list unless a test supplies its own. */
function parse(
	text: string,
	people: readonly string[] = PEOPLE,
	kids?: readonly string[],
) {
	return parseHistory(text, people, kids);
}

function entry(year: number, giver: string, receiver: string): HistoryEntry {
	return { year, giver, receiver };
}

describe("parseHistory", () => {
	it("returns nothing for empty or blank text", () => {
		const nothing = { entries: [], errors: [], unknownNames: [] };

		expect(parse("")).toEqual(nothing);
		expect(parse("  \n\n\t\n")).toEqual(nothing);
	});

	it("reads years and pairings in the canonical format", () => {
		const text = "2025\nAlice -> Bob\nBob -> Alice\n\n2024\nAlice -> Carol";

		expect(parse(text)).toEqual({
			entries: [
				entry(2025, "Alice", "Bob"),
				entry(2025, "Bob", "Alice"),
				entry(2024, "Alice", "Carol"),
			],
			errors: [],
			unknownNames: [],
		});
	});

	it("reads a real pasted chat announcement", () => {
		const message = [
			"🎄🎄 Kris Kringle 2024 🎄🎄",
			"",
			"Alice → Bob",
			"Bob ➡️ Carol",
			"• Carol gives to Dan",
			"- Dan is buying for Erin",
			"5) Erin has Alice",
			"",
			"🎁🎁🎁",
		].join("\r\n");

		expect(parse(message)).toEqual({
			entries: [
				entry(2024, "Alice", "Bob"),
				entry(2024, "Bob", "Carol"),
				entry(2024, "Carol", "Dan"),
				entry(2024, "Dan", "Erin"),
				entry(2024, "Erin", "Alice"),
			],
			errors: [],
			unknownNames: [],
		});
	});

	it.each([
		["Alice -> Bob"],
		["Alice --> Bob"],
		["Alice => Bob"],
		["Alice → Bob"],
		["Alice ➡️ Bob"],
		["Alice->Bob"],
		["Alice: Bob"],
		["Alice - Bob"],
		["Alice – Bob"],
		["Alice — Bob"],
		["Alice gives to Bob"],
		["Alice is giving to Bob"],
		["Alice buys for Bob"],
		["Alice is buying for Bob"],
		["Alice has Bob"],
		["Alice got Bob"],
		["Alice drew Bob"],
		["ALICE GIVES TO BOB"],
	])("reads the pairing %j", (line) => {
		expect(parse(`2024\n${line}`)).toEqual({
			entries: [entry(2024, "Alice", "Bob")],
			errors: [],
			unknownNames: [],
		});
	});

	it.each([
		["2023"],
		["2023:"],
		["Kris Kringle 2023"],
		["**KK 2023 — Christmas at Mum's**"],
		["Year: 2023"],
	])("treats %j as the heading for 2023", (heading) => {
		expect(parse(`${heading}\nAlice -> Bob`).entries).toEqual([
			entry(2023, "Alice", "Bob"),
		]);
	});

	it("reads a pairing written on the same line as its year", () => {
		const text = "2022: Alice -> Bob\nCarol -> Dan (2021)";

		expect(parse(text).entries).toEqual([
			entry(2022, "Alice", "Bob"),
			entry(2021, "Carol", "Dan"),
		]);
	});

	it("strips decoration but keeps real name punctuation", () => {
		const people = ["Mary-Anne O'Neil", "Bob (uncle)", "José María", "Zoë"];
		const text = [
			"2024",
			"**@Mary-Anne O'Neil** -> Bob (uncle) 🎁",
			"1. José   María => Zoë.",
		].join("\n");

		expect(parse(text, people)).toEqual({
			entries: [
				entry(2024, "Mary-Anne O'Neil", "Bob (uncle)"),
				entry(2024, "José María", "Zoë"),
			],
			errors: [],
			unknownNames: [],
		});
	});

	it("merges a year that appears in more than one block", () => {
		const text =
			"2024\nAlice -> Bob\n\n2023\nAlice -> Carol\n\n2024\nBob -> Alice";

		expect(parse(text).entries).toEqual([
			entry(2024, "Alice", "Bob"),
			entry(2023, "Alice", "Carol"),
			entry(2024, "Bob", "Alice"),
		]);
	});

	describe("people list", () => {
		it("rejects a nickname of someone who is on the list", () => {
			const people = ["William", "Sarah"];

			const result = parse("2024\nWill -> Sarah\nSarah -> William", people);

			expect(result).toEqual({
				entries: [entry(2024, "Sarah", "William")],
				errors: [
					{
						line: 2,
						text: "Will -> Sarah",
						message: "Not on the people list: Will.",
					},
				],
				unknownNames: ["Will"],
			});
		});

		it("accepts the nickname once it has been added to the list", () => {
			const people = ["William", "Sarah", "Will"];

			const result = parse("2024\nWill -> Sarah", people);

			expect(result.errors).toEqual([]);
			expect(result.entries).toEqual([entry(2024, "Will", "Sarah")]);
		});

		it("rejects an unknown receiver as well as an unknown giver", () => {
			const { entries, errors, unknownNames } = parse(
				"2024\nAlice -> Zed\nYan -> Xavier",
			);

			expect(entries).toEqual([]);
			expect(errors.map((error) => error.message)).toEqual([
				"Not on the people list: Zed.",
				"Not on the people list: Yan, Xavier.",
			]);
			expect(unknownNames).toEqual(["Zed", "Yan", "Xavier"]);
		});

		it("lists each unknown name once, however often it appears", () => {
			const text = "2024\nZed -> Alice\nBob -> ZED\n2023\nzed -> Bob";

			const { errors, unknownNames } = parse(text);

			expect(errors).toHaveLength(3);
			expect(unknownNames).toHaveLength(1);
		});

		it("matches the list ignoring case and spacing, and keeps its spelling", () => {
			const people = ["Mary Anne", "Bob"];

			const result = parse("2024\nMARY   anne -> bob", people);

			expect(result.errors).toEqual([]);
			expect(result.entries).toEqual([entry(2024, "Mary Anne", "Bob")]);
		});

		it("rejects every pairing when the list is empty", () => {
			const { entries, unknownNames } = parse("2024\nAlice -> Bob", []);

			expect(entries).toEqual([]);
			expect(unknownNames).toEqual(["Alice", "Bob"]);
		});

		it("does not report unknown names for lines that fail earlier checks", () => {
			const { errors, unknownNames } = parse("Zed -> Yan\n2024\nZed -> zed");

			expect(errors).toHaveLength(2);
			expect(unknownNames).toEqual([]);
		});
	});

	describe("malformed input", () => {
		it("reports unreadable lines with their line numbers, keeping the rest", () => {
			const text = [
				"Kris Kringle 2024",
				"Hi all! Here's who you're buying for this year ($50 limit):",
				"Alice -> Bob",
				"Merry Christmas to all",
				"Bob -> Alice",
			].join("\n");

			const { entries, errors } = parse(text);

			expect(entries).toEqual([
				entry(2024, "Alice", "Bob"),
				entry(2024, "Bob", "Alice"),
			]);
			expect(errors).toEqual([
				{
					line: 2,
					text: "Hi all! Here's who you're buying for this year ($50 limit):",
					message: 'Expected a pairing like "Alice -> Bob".',
				},
				{
					line: 4,
					text: "Merry Christmas to all",
					message: 'Expected a pairing like "Alice -> Bob".',
				},
			]);
		});

		it("reports pairings that come before any year", () => {
			const { entries, errors } = parse("Alice -> Bob\n2024\nBob -> Alice");

			expect(entries).toEqual([entry(2024, "Bob", "Alice")]);
			expect(errors).toEqual([
				{
					line: 1,
					text: "Alice -> Bob",
					message: "No year yet — put the year on a line above this one.",
				},
			]);
		});

		it.each([["Alice ->"], ["-> Bob"], ["Alice"], ["Alice Bob"]])(
			"reports the incomplete pairing %j",
			(line) => {
				const { entries, errors } = parse(`2024\n${line}`);

				expect(entries).toEqual([]);
				expect(errors).toMatchObject([{ line: 2, text: line }]);
			},
		);

		it("reports someone giving to themselves", () => {
			const { entries, errors } = parse("2024\nAlice -> alice");

			expect(entries).toEqual([]);
			expect(errors).toMatchObject([
				{ line: 2, message: "Alice cannot give to themselves." },
			]);
		});

		it("reports a giver listed twice in one year, but not across years", () => {
			const text = "2024\nAlice -> Bob\nALICE -> Carol\n2023\nAlice -> Bob";

			const { entries, errors } = parse(text);

			expect(entries).toEqual([
				entry(2024, "Alice", "Bob"),
				entry(2023, "Alice", "Bob"),
			]);
			expect(errors).toMatchObject([
				{ line: 3, message: "Alice already has a pairing in 2024." },
			]);
		});

		it("reports names that are too long", () => {
			const long = "x".repeat(61);

			const { entries, errors } = parse(`2024\n${long} -> Bob`);

			expect(entries).toEqual([]);
			expect(errors).toMatchObject([
				{ line: 2, message: "Names must be 1–60 characters long." },
			]);
		});

		it("does not mistake other numbers for a year", () => {
			const { entries, errors } = parse("12024\nAlice -> Bob");

			expect(entries).toEqual([]);
			expect(errors.map((error) => error.line)).toEqual([1, 2]);
		});
	});
});

describe("parseHistory for kids' presents", () => {
	const KIDS = ["Tom", "Lily", "Max"];

	it("takes givers from the people list and receivers from the kids", () => {
		expect(
			parse("Kids 2025\nalice -> TOM\nBob has Lily", PEOPLE, KIDS),
		).toEqual({
			entries: [entry(2025, "Alice", "Tom"), entry(2025, "Bob", "Lily")],
			errors: [],
			unknownNames: [],
		});
	});

	it("rejects an adult as a receiver", () => {
		const { entries, errors, unknownNames } = parse(
			"2025\nAlice -> Bob",
			PEOPLE,
			KIDS,
		);

		expect(entries).toEqual([]);
		expect(errors).toMatchObject([
			{ line: 2, message: "Not a kid in any family: Bob." },
		]);
		expect(unknownNames).toEqual([]);
	});

	it("collects unknown givers for the people list but not unknown kids", () => {
		const { errors, unknownNames } = parse("2025\nZed -> Yan", PEOPLE, KIDS);

		expect(errors).toMatchObject([
			{
				message: "Not on the people list: Zed. Not a kid in any family: Yan.",
			},
		]);
		expect(unknownNames).toEqual(["Zed"]);
	});

	it("reads back its own announcement", () => {
		const announcement = formatAnnouncement(
			2026,
			[{ giver: "Alice", receiver: "Max" }],
			"Kids' presents",
		);

		expect(announcement).toBe("Kids' presents 2026\nAlice → Max");
		expect(parse(announcement, PEOPLE, KIDS).entries).toEqual([
			entry(2026, "Alice", "Max"),
		]);
	});
});

describe("dropErrorLines", () => {
	it("removes only the lines that have problems", () => {
		const text = "2024\nhello there\nAlice -> Bob\nZed -> Alice\nBob -> Alice";

		const cleaned = dropErrorLines(text, parse(text).errors);

		expect(cleaned).toBe("2024\nAlice -> Bob\nBob -> Alice");
		expect(parse(cleaned).errors).toEqual([]);
	});

	it("returns the text unchanged when there are no errors", () => {
		expect(dropErrorLines("2024\nAlice -> Bob", [])).toBe("2024\nAlice -> Bob");
	});
});

describe("groupByYear", () => {
	it("groups entries by year, newest first, keeping entry order", () => {
		const entries = [
			entry(2023, "Alice", "Bob"),
			entry(2025, "Bob", "Carol"),
			entry(2023, "Bob", "Alice"),
		];

		expect(groupByYear(entries)).toEqual([
			{ year: 2025, assignments: [{ giver: "Bob", receiver: "Carol" }] },
			{
				year: 2023,
				assignments: [
					{ giver: "Alice", receiver: "Bob" },
					{ giver: "Bob", receiver: "Alice" },
				],
			},
		]);
	});

	it("returns nothing for no entries", () => {
		expect(groupByYear([])).toEqual([]);
	});
});

describe("serialiseHistory", () => {
	const people = ["Alice", "Bob", "Mary-Anne O'Neil", "Bob (uncle)"];
	const entries = [
		entry(2024, "Alice", "Bob"),
		entry(2025, "Mary-Anne O'Neil", "Bob (uncle)"),
		entry(2024, "Bob", "Alice"),
	];

	it("writes one block per year, newest first", () => {
		expect(serialiseHistory(entries)).toBe(
			"2025\nMary-Anne O'Neil -> Bob (uncle)\n\n2024\nAlice -> Bob\nBob -> Alice",
		);
	});

	it("writes nothing for no history", () => {
		expect(serialiseHistory([])).toBe("");
	});

	it("round-trips through parseHistory", () => {
		const reparsed = parse(serialiseHistory(entries), people);

		expect(reparsed.errors).toEqual([]);
		expect(groupByYear(reparsed.entries)).toEqual(groupByYear(entries));
	});
});

describe("replaceYear", () => {
	const history = [entry(2024, "Alice", "Bob"), entry(2025, "Alice", "Carol")];

	it("replaces one year's entries and leaves the others", () => {
		const updated = replaceYear(history, 2025, [
			{ giver: "Alice", receiver: "Dan" },
			{ giver: "Dan", receiver: "Alice" },
		]);

		expect(updated).toEqual([
			entry(2024, "Alice", "Bob"),
			entry(2025, "Alice", "Dan"),
			entry(2025, "Dan", "Alice"),
		]);
	});

	it("adds a year that was not there before without mutating the input", () => {
		const updated = replaceYear(history, 2026, [
			{ giver: "Bob", receiver: "Alice" },
		]);

		expect(updated).toEqual([...history, entry(2026, "Bob", "Alice")]);
		expect(history).toHaveLength(2);
	});
});

describe("formatAnnouncement", () => {
	const assignments = [
		{ giver: "Alice", receiver: "Bob" },
		{ giver: "Bob", receiver: "Alice" },
	];

	it("writes a chat-ready message", () => {
		expect(formatAnnouncement(2026, assignments)).toBe(
			"Kris Kringle 2026\nAlice → Bob\nBob → Alice",
		);
	});

	it("can be pasted straight back into history", () => {
		expect(parse(formatAnnouncement(2026, assignments))).toEqual({
			entries: [entry(2026, "Alice", "Bob"), entry(2026, "Bob", "Alice")],
			errors: [],
			unknownNames: [],
		});
	});
});
