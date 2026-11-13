import { type SubmitEvent, useId, useState } from "react";
import { addFamily, parentsWithoutKids } from "../../lib/families";
import { nameKey } from "../../lib/utils";
import type { Family } from "../../types/families";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { controlClass, labelClass } from "../ui/controlClass";
import { FamilyCard } from "./FamilyCard";
import { StorageErrorAlert } from "./StorageErrorAlert";

type FamilyListProps = {
	participants: readonly string[];
	families: readonly Family[];
	/** Persists the families and returns whether they were saved. */
	onChange: (families: Family[]) => boolean;
};

/**
 * A child is in one family only, so the kids identify a family. A family
 * with no kids yet is identified by its parents instead.
 */
function familyKey(family: Family): string {
	return family.kids.length > 0
		? `kids:${family.kids.map(nameKey).join("\u0000")}`
		: `parents:${family.parents.map(nameKey).join("\u0000")}`;
}

export function FamilyList({
	participants,
	families,
	onChange,
}: FamilyListProps) {
	const [draft, setDraft] = useState("");
	const [parentChoice, setParentChoice] = useState("");
	const [skipped, setSkipped] = useState<string[]>([]);
	const [hasSaveError, setHasSaveError] = useState(false);
	const kidsId = useId();
	const parentId = useId();
	const hintId = useId();

	// Someone who already heads a family with no kids yet adds kids to that
	// family instead of starting another.
	const waiting = new Set(parentsWithoutKids(families).map(nameKey));
	const parentOptions = participants.filter(
		(name) => !waiting.has(nameKey(name)),
	);
	const parent = parentOptions.includes(parentChoice) ? parentChoice : "";

	const commit = (next: Family[]) => {
		setHasSaveError(!onChange(next));
	};

	const handleAddFamily = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = addFamily(families, draft, parent);
		setSkipped(result.skipped);
		if (result.families.length === families.length) return;
		setDraft("");
		setParentChoice("");
		commit(result.families);
	};

	return (
		<>
			<p className="text-sm text-ink-muted">
				Parents already buy for their own kids, so the draw never gives a parent
				their own child. Kids don't buy presents and aren't on the people list.
			</p>

			{hasSaveError && <StorageErrorAlert />}

			{families.length > 0 && (
				<ul aria-label="Families" className="space-y-4">
					{families.map((family, index) => (
						<FamilyCard
							key={familyKey(family)}
							families={families}
							index={index}
							participants={participants}
							onChange={commit}
						/>
					))}
				</ul>
			)}

			<form
				onSubmit={handleAddFamily}
				className="grid gap-4 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
			>
				<div>
					<label htmlFor={parentId} className={labelClass}>
						New family's parent
					</label>
					<select
						id={parentId}
						value={parent}
						onChange={(event) => setParentChoice(event.target.value)}
						aria-describedby={hintId}
						className={controlClass}
					>
						<option value="">None yet</option>
						{parentOptions.map((name) => (
							<option key={name} value={name}>
								{name}
							</option>
						))}
					</select>
				</div>
				<div>
					<label htmlFor={kidsId} className={labelClass}>
						New family's kids
					</label>
					<input
						id={kidsId}
						type="text"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						aria-describedby={hintId}
						autoComplete="off"
						className={controlClass}
					/>
				</div>
				<Button type="submit" disabled={parent === "" && draft.trim() === ""}>
					Add family
				</Button>
			</form>
			<p id={hintId} className="text-sm text-ink-muted">
				Give a parent, the kids, or both; separate several kids with commas. A
				couple with no kids yet can be added now and their kids later.
			</p>
			{skipped.length > 0 && (
				<Alert tone="info">
					Skipped (already in a family, or too long): {skipped.join(", ")}
				</Alert>
			)}
		</>
	);
}
