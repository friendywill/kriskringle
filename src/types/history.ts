import * as z from "zod/mini";
import type { Assignment } from "./draw";
import { nameSchema } from "./participants";

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2099;

export const yearSchema = z.int().check(z.gte(MIN_YEAR), z.lte(MAX_YEAR));

/**
 * One "giver bought for receiver" fact. Every entry carries its own year so
 * the rotation rule is computed from stored data, never from ordering.
 */
export const historyEntrySchema = z.object({
	year: yearSchema,
	giver: nameSchema,
	receiver: nameSchema,
});

export const historySchema = z.array(historyEntrySchema);

export type HistoryEntry = z.infer<typeof historyEntrySchema>;

/** A line of pasted history text that could not be turned into an entry. */
export type HistoryParseError = {
	/** 1-based line number in the pasted text. */
	line: number;
	/** The offending line, trimmed. */
	text: string;
	message: string;
};

export type HistoryParseResult = {
	entries: HistoryEntry[];
	errors: HistoryParseError[];
};

/** History entries for a single year, for display. */
export type YearGroup = {
	year: number;
	assignments: Assignment[];
};
