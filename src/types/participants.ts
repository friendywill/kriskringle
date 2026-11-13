// zod/mini is the tree-shakable build of Zod: same validation, a fraction
// of the bundle. Constraints go through .check() instead of chained methods.
import * as z from "zod/mini";

export const MAX_NAME_LENGTH = 60;

/** A person's display name, as typed or pasted by the user. */
export const nameSchema = z
	.string()
	.check(z.trim(), z.minLength(1), z.maxLength(MAX_NAME_LENGTH));

/** The stored list of people taking part in the draw. */
export const participantsSchema = z.array(nameSchema);

export type Participants = z.infer<typeof participantsSchema>;

/** Outcome of adding typed names to the existing list. */
export type AddParticipantsResult = {
	participants: string[];
	/** Names left out because they were duplicates or too long. */
	skipped: string[];
};
