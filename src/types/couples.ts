import * as z from "zod/mini";
import { nameSchema } from "./participants";

/**
 * Two people who already buy each other gifts, so the draw must never pair
 * them. The order of the two names carries no meaning.
 */
export const coupleSchema = z.tuple([nameSchema, nameSchema]);

/** The stored list of couples. */
export const couplesSchema = z.array(coupleSchema);

export type Couple = z.infer<typeof coupleSchema>;
