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

function entry(year: number, giver: string, receiver: string): HistoryEntry {
	return { year, giver, receiver };
}

describe("parseHistory", () => {
	it("returns nothing for empty or blank text", () => {
		expect(parseHistory("")).toEqual({ entries: [], errors: [] });
		expect(parseHistory("  \n\n\t\n")).toEqual({ entries: [], errors: [] });
	});

	it("reads years and pairings in the canonical format", () => {
		const text = "2025\nAlice -> Bob\nBob -> Alice\n\n2024\nAlice -> Carol";

		expect(parseHistory(text)).toEqual({
			entries: [
				entry(2025, "Alice", "Bob"),
				entry(2025, "Bob", "Alice"),
				entry(2024, "Alice", "Carol"),
			],
			errors: [],
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

		expect(parseHistory(message)).toEqual({
			entries: [
				entry(2024, "Alice", "Bob"),
				entry(2024, "Bob", "Carol"),
				entry(2024, "Carol", "Dan"),
				entry(2024, "Dan", "Erin"),
				entry(2024, "Erin", "Alice"),
			],
			errors: [],
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
		const { entries, errors } = parseHistory(`2024\n${line}`);

		expect(errors).toEqual([]);
		expect(entries).toHaveLength(1);
		expect(entries[0]?.giver.toLowerCase()).toBe("alice");
		expect(entries[0]?.receiver.toLowerCase()).toBe("bob");
	});

	it.each([
		["2023"],
		["2023:"],
		["Kris Kringle 2023"],
		["**KK 2023 — Christmas at Mum's**"],
		["Year: 2023"],
	])("treats %j as the heading for 2023", (heading) => {
		expect(parseHistory(`${heading}\nAlice -> Bob`)).toEqual({
			entries: [entry(2023, "Alice", "Bob")],
			errors: [],
		});
	});

	it("reads a pairing written on the same line as its year", () => {
		const text = "2022: Alice -> Bob\nCarol -> Dan (2021)";

		expect(parseHistory(text)).toEqual({
			entries: [entry(2022, "Alice", "Bob"), entry(2021, "Carol", "Dan")],
			errors: [],
		});
	});

	it("strips decoration but keeps real name punctuation", () => {
		const text = [
			"2024",
			"**@Mary-Anne O'Neil** -> Bob (uncle) 🎁",
			"1. José   María => Zoë.",
		].join("\n");

		expect(parseHistory(text).entries).toEqual([
			entry(2024, "Mary-Anne O'Neil", "Bob (uncle)"),
			entry(2024, "José María", "Zoë"),
		]);
	});

	it("merges a year that appears in more than one block", () => {
		const text =
			"2024\nAlice -> Bob\n\n2023\nAlice -> Carol\n\n2024\nBob -> Alice";

		expect(parseHistory(text).entries).toEqual([
			entry(2024, "Alice", "Bob"),
			entry(2023, "Alice", "Carol"),
			entry(2024, "Bob", "Alice"),
		]);
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

			const { entries, errors } = parseHistory(text);

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
			const { entries, errors } = parseHistory(
				"Alice -> Bob\n2024\nBob -> Alice",
			);

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
				const { entries, errors } = parseHistory(`2024\n${line}`);

				expect(entries).toEqual([]);
				expect(errors).toMatchObject([{ line: 2, text: line }]);
			},
		);

		it("reports someone giving to themselves", () => {
			const { entries, errors } = parseHistory("2024\nAlice -> alice");

			expect(entries).toEqual([]);
			expect(errors).toMatchObject([
				{ line: 2, message: "Alice cannot give to themselves." },
			]);
		});

		it("reports a giver listed twice in one year, but not across years", () => {
			const text = "2024\nAlice -> Bob\nALICE -> Carol\n2023\nAlice -> Bob";

			const { entries, errors } = parseHistory(text);

			expect(entries).toEqual([
				entry(2024, "Alice", "Bob"),
				entry(2023, "Alice", "Bob"),
			]);
			expect(errors).toMatchObject([
				{ line: 3, message: "ALICE already has a pairing in 2024." },
			]);
		});

		it("reports names that are too long", () => {
			const long = "x".repeat(61);

			const { entries, errors } = parseHistory(`2024\n${long} -> Bob`);

			expect(entries).toEqual([]);
			expect(errors).toMatchObject([
				{ line: 2, message: "Names must be 1–60 characters long." },
			]);
		});

		it("does not mistake other numbers for a year", () => {
			const { entries, errors } = parseHistory("12024\nAlice -> Bob");

			expect(entries).toEqual([]);
			expect(errors.map((error) => error.line)).toEqual([1, 2]);
		});
	});
});

describe("dropErrorLines", () => {
	it("removes only the lines that could not be read", () => {
		const text = "2024\nhello there\nAlice -> Bob\nwhat is this\nBob -> Alice";

		const cleaned = dropErrorLines(text, parseHistory(text).errors);

		expect(cleaned).toBe("2024\nAlice -> Bob\nBob -> Alice");
		expect(parseHistory(cleaned).errors).toEqual([]);
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
		const reparsed = parseHistory(serialiseHistory(entries));

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
		expect(parseHistory(formatAnnouncement(2026, assignments))).toEqual({
			entries: [entry(2026, "Alice", "Bob"), entry(2026, "Bob", "Alice")],
			errors: [],
		});
	});
});
