import { type SubmitEvent, useId, useState } from "react";
import { addFamily } from "../../lib/families";
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

export function FamilyList({
	participants,
	families,
	onChange,
}: FamilyListProps) {
	const [draft, setDraft] = useState("");
	const [skipped, setSkipped] = useState<string[]>([]);
	const [hasSaveError, setHasSaveError] = useState(false);
	const inputId = useId();
	const hintId = useId();

	const commit = (next: Family[]) => {
		setHasSaveError(!onChange(next));
	};

	const handleAddFamily = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = addFamily(families, draft);
		setSkipped(result.skipped);
		setDraft("");
		if (result.families.length > families.length) commit(result.families);
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
							// A child is in one family only, so the kids identify it.
							key={family.kids.map(nameKey).join("\u0000")}
							families={families}
							index={index}
							participants={participants}
							onChange={commit}
						/>
					))}
				</ul>
			)}

			<form onSubmit={handleAddFamily} className="flex items-end gap-2">
				<div className="flex-1">
					<label htmlFor={inputId} className={labelClass}>
						New family's kids
					</label>
					<input
						id={inputId}
						type="text"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						aria-describedby={hintId}
						autoComplete="off"
						className={controlClass}
					/>
				</div>
				<Button type="submit">Add family</Button>
			</form>
			<p id={hintId} className="text-sm text-ink-muted">
				Separate several kids with commas, then add their parents.
			</p>
			{skipped.length > 0 && (
				<Alert tone="info">
					Skipped (already in a family, or too long): {skipped.join(", ")}
				</Alert>
			)}
		</>
	);
}
