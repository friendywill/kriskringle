import * as z from "zod/mini";
import { nameSchema } from "./participants";

/**
 * A household for the kids' presents: the children, and the adults who
 * already buy for them and so must not draw them.
 *
 * Parents are names from the people list. Kids are not on the people list;
 * a kid belongs to exactly one family. `parents` may be empty when the
 * child's parents are not taking part.
 */
export const familySchema = z.object({
	parents: z.array(nameSchema),
	kids: z.array(nameSchema),
});

/** The stored list of families. */
export const familiesSchema = z.array(familySchema);

export type Family = z.infer<typeof familySchema>;

/** Outcome of adding typed kids' names to the families. */
export type AddKidsResult = {
	families: Family[];
	/** Names left out because they were duplicates or too long. */
	skipped: string[];
};
