import type { Assignment } from "../types/draw";
import {
	type HistoryEntry,
	type HistoryParseError,
	type HistoryParseResult,
	historyEntrySchema,
	type YearGroup,
} from "../types/history";
import { MAX_NAME_LENGTH } from "../types/participants";
import { cleanName, nameKey } from "./utils";

/*
 * History text format, loose enough to take a pasted chat announcement:
 *
 *   Kris Kringle 2024        <- any line containing a year starts that year
 *   Alice -> Bob             <- one pairing per line, giver first
 *   Carol gives to Dan
 *
 * Bullets, numbering, emoji and blank lines are ignored. Anything else that
 * cannot be read is reported with its line number — never silently dropped.
 *
 * Every name must be on the people list. That is what catches "Will" when
 * the list says "William": history under a second spelling would not count
 * against the person it belongs to, and the draw could repeat a pairing.
 */

/** A standalone four-digit year, 1900–2099. */
const YEAR = /(?<![\p{L}\p{N}])(?:19|20)\d{2}(?![\p{L}\p{N}])/u;
const LIST_MARKER = /^(?:[-*•·▪◦‣]+|\d{1,2}[.)])\s+/u;
const HAS_CONTENT = /[\p{L}\p{N}]/u;

const ARROW = /\s*(?:-+>|=+>|[→⇒⟶➜➔➡]️?)\s*/u;
const PHRASE =
	/\s+(?:is\s+)?(?:gives\s+to|giving\s+to|buys\s+for|buying\s+for|has|got|drew)\s+/iu;
const PUNCTUATION = /\s*[:–—]\s*|\s+-\s+/u;

/** Tried in order: an explicit arrow beats a phrase, which beats a dash. */
const SEPARATORS = [ARROW, PHRASE, PUNCTUATION];

/** Longer than this reads as a sentence from the chat, not a name. */
const MAX_NAME_WORDS = 4;

/** Strips decoration (emoji, @, bold markers, punctuation) around a name. */
function tidyName(text: string): string {
	const name = cleanName(
		text.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, ""),
	);
	// Trimming punctuation also takes the ")" off "Bob (uncle)": put it back.
	return name.includes("(") && !name.includes(")") ? `${name})` : name;
}

function isPlausibleName(name: string): boolean {
	return name !== "" && name.split(" ").length <= MAX_NAME_WORDS;
}

function splitPair(text: string): Assignment | null {
	for (const separator of SEPARATORS) {
		const match = separator.exec(text);
		if (match === null) continue;
		const giver = tidyName(text.slice(0, match.index));
		const receiver = tidyName(text.slice(match.index + match[0].length));
		return isPlausibleName(giver) && isPlausibleName(receiver)
			? { giver, receiver }
			: null;
	}
	return null;
}

/**
 * Parses pasted or hand-edited history text. Input is untrusted: every row
 * is validated, and each unreadable line produces an error instead of being
 * dropped, so the caller can show the user exactly what needs fixing.
 *
 * Only names on `people` are accepted, matched ignoring case and spacing.
 * Entries come back in the list's spelling; names that are not on the list
 * are reported as errors and collected in `unknownNames`.
 */
export function parseHistory(
	text: string,
	people: readonly string[],
): HistoryParseResult {
	const entries: HistoryEntry[] = [];
	const errors: HistoryParseError[] = [];
	const listed = new Map(people.map((name) => [nameKey(name), name]));
	const unknown = new Map<string, string>();
	const seenGivers = new Set<string>();
	let year: number | null = null;

	for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
		const trimmed = rawLine.trim();
		const line = trimmed.replace(LIST_MARKER, "");
		if (!HAS_CONTENT.test(line)) continue;

		const report = (message: string) => {
			errors.push({ line: index + 1, text: trimmed, message });
		};

		let pairText = line;
		const yearMatch = YEAR.exec(line);
		if (yearMatch !== null) {
			year = Number(yearMatch[0]);
			// A heading may carry a pairing too ("2024: Alice -> Bob"), but
			// only an explicit arrow counts, so titles are not misread.
			pairText = `${line.slice(0, yearMatch.index)} ${line.slice(
				yearMatch.index + yearMatch[0].length,
			)}`;
			if (!ARROW.test(pairText)) continue;
		}

		const pair = splitPair(pairText);
		if (pair === null) {
			report('Expected a pairing like "Alice -> Bob".');
			continue;
		}
		if (year === null) {
			report("No year yet — put the year on a line above this one.");
			continue;
		}

		const entry = historyEntrySchema.safeParse({ year, ...pair });
		if (!entry.success) {
			report(`Names must be 1–${MAX_NAME_LENGTH} characters long.`);
			continue;
		}
		if (nameKey(entry.data.giver) === nameKey(entry.data.receiver)) {
			report(`${entry.data.giver} cannot give to themselves.`);
			continue;
		}

		const strangers = [entry.data.giver, entry.data.receiver].filter(
			(name) => !listed.has(nameKey(name)),
		);
		if (strangers.length > 0) {
			for (const name of strangers) unknown.set(nameKey(name), name);
			report(`Not on the people list: ${strangers.join(", ")}.`);
			continue;
		}

		// Keep the list's spelling, so "alice" in a chat is saved as "Alice".
		const giver = listed.get(nameKey(entry.data.giver)) ?? entry.data.giver;
		const receiver =
			listed.get(nameKey(entry.data.receiver)) ?? entry.data.receiver;

		const giverKey = `${year}\u0000${nameKey(giver)}`;
		if (seenGivers.has(giverKey)) {
			report(`${giver} already has a pairing in ${year}.`);
			continue;
		}

		seenGivers.add(giverKey);
		entries.push({ year, giver, receiver });
	}

	return { entries, errors, unknownNames: [...unknown.values()] };
}

/** Removes the lines that `parseHistory` reported as errors. */
export function dropErrorLines(
	text: string,
	errors: readonly HistoryParseError[],
): string {
	const unreadable = new Set(errors.map((error) => error.line));
	return text
		.split(/\r?\n/)
		.filter((_, index) => !unreadable.has(index + 1))
		.join("\n");
}

/** Groups entries by year, newest year first. */
export function groupByYear(entries: readonly HistoryEntry[]): YearGroup[] {
	const byYear = new Map<number, Assignment[]>();
	for (const { year, giver, receiver } of entries) {
		const assignments = byYear.get(year) ?? [];
		assignments.push({ giver, receiver });
		byYear.set(year, assignments);
	}
	return [...byYear]
		.sort(([a], [b]) => b - a)
		.map(([year, assignments]) => ({ year, assignments }));
}

/**
 * Writes history as editable text, newest year first. The output always
 * parses back to the same entries with `parseHistory`.
 */
export function serialiseHistory(entries: readonly HistoryEntry[]): string {
	return groupByYear(entries)
		.map(({ year, assignments }) =>
			[
				String(year),
				...assignments.map(({ giver, receiver }) => `${giver} -> ${receiver}`),
			].join("\n"),
		)
		.join("\n\n");
}

/** Returns history with one year's entries replaced by a new draw. */
export function replaceYear(
	history: readonly HistoryEntry[],
	year: number,
	assignments: readonly Assignment[],
): HistoryEntry[] {
	return [
		...history.filter((entry) => entry.year !== year),
		...assignments.map(({ giver, receiver }) => ({ year, giver, receiver })),
	];
}

/**
 * Formats a draw as a message for the group chat. Deliberately readable by
 * `parseHistory`, so the announcement can be pasted back in later.
 */
export function formatAnnouncement(
	year: number,
	assignments: readonly Assignment[],
): string {
	return [
		`Kris Kringle ${year}`,
		...assignments.map(({ giver, receiver }) => `${giver} → ${receiver}`),
	].join("\n");
}
