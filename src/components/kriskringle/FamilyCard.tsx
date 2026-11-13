import { type SubmitEvent, useId, useState } from "react";
import {
	addKids,
	addParent,
	familyLabel,
	removeFamily,
	removeKid,
	removeParent,
} from "../../lib/families";
import { nameKey } from "../../lib/utils";
import type { Family } from "../../types/families";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { controlClass, labelClass } from "../ui/controlClass";

type FamilyCardProps = {
	families: readonly Family[];
	index: number;
	/** Everyone on the people list: the adults who can be parents. */
	participants: readonly string[];
	onChange: (families: Family[]) => void;
};

const CHIP_CLASS =
	"flex items-center gap-1 rounded-full border border-line bg-canvas py-1 pr-1 pl-3 text-sm";
const CHIP_REMOVE_CLASS =
	"flex size-6 items-center justify-center rounded-full text-ink-muted hover:bg-danger-surface hover:text-danger focus-visible:outline-2 focus-visible:outline-brand";

export function FamilyCard({
	families,
	index,
	participants,
	onChange,
}: FamilyCardProps) {
	const [kidsDraft, setKidsDraft] = useState("");
	const [skipped, setSkipped] = useState<string[]>([]);
	const [parentChoice, setParentChoice] = useState("");
	const kidsId = useId();
	const parentId = useId();

	const family = families[index];
	if (family === undefined) return null;
	const label = familyLabel(family);

	const isParent = (name: string) =>
		family.parents.some((parent) => nameKey(parent) === nameKey(name));
	const possibleParents = participants.filter((name) => !isParent(name));
	const parentToAdd = possibleParents.includes(parentChoice)
		? parentChoice
		: "";

	const handleAddKids = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = addKids(families, index, kidsDraft);
		setSkipped(result.skipped);
		setKidsDraft("");
		onChange(result.families);
	};

	const handleAddParent = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (parentToAdd === "") return;
		setParentChoice("");
		onChange(addParent(families, index, parentToAdd));
	};

	return (
		<li className="space-y-4 rounded-lg border border-line p-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="font-semibold">{label}</h3>
				<Button
					variant="secondary"
					aria-label={`Remove ${label}`}
					onClick={() => onChange(removeFamily(families, index))}
				>
					Remove family
				</Button>
			</div>

			<div className="space-y-2">
				<h4 className="text-sm font-semibold text-ink-muted">Kids</h4>
				{family.kids.length > 0 && (
					<ul aria-label={`Kids in ${label}`} className="flex flex-wrap gap-2">
						{family.kids.map((kid) => (
							<li key={kid} className={CHIP_CLASS}>
								{kid}
								<button
									type="button"
									onClick={() => onChange(removeKid(families, index, kid))}
									aria-label={`Remove ${kid}`}
									className={CHIP_REMOVE_CLASS}
								>
									<span aria-hidden="true">×</span>
								</button>
							</li>
						))}
					</ul>
				)}
				<form onSubmit={handleAddKids} className="flex items-end gap-2">
					<div className="flex-1">
						<label htmlFor={kidsId} className={labelClass}>
							Add kids<span className="sr-only"> to {label}</span>
						</label>
						<input
							id={kidsId}
							type="text"
							value={kidsDraft}
							onChange={(event) => setKidsDraft(event.target.value)}
							autoComplete="off"
							className={controlClass}
						/>
					</div>
					<Button type="submit" aria-label={`Add these kids to ${label}`}>
						Add
					</Button>
				</form>
				{skipped.length > 0 && (
					<Alert tone="info">
						Skipped (already in a family, or too long): {skipped.join(", ")}
					</Alert>
				)}
			</div>

			<div className="space-y-2">
				<h4 className="text-sm font-semibold text-ink-muted">Parents</h4>
				{family.parents.length === 0 ? (
					<p className="text-sm text-ink-muted">
						No parents set, so any adult may buy for these kids.
					</p>
				) : (
					<ul
						aria-label={`Parents in ${label}`}
						className="flex flex-wrap gap-2"
					>
						{family.parents.map((parent) => (
							<li key={parent} className={CHIP_CLASS}>
								{parent}
								<button
									type="button"
									onClick={() =>
										onChange(removeParent(families, index, parent))
									}
									aria-label={`Remove ${parent} as a parent in ${label}`}
									className={CHIP_REMOVE_CLASS}
								>
									<span aria-hidden="true">×</span>
								</button>
							</li>
						))}
					</ul>
				)}
				{possibleParents.length > 0 && (
					<form onSubmit={handleAddParent} className="flex items-end gap-2">
						<div className="flex-1">
							<label htmlFor={parentId} className={labelClass}>
								Add parent<span className="sr-only"> to {label}</span>
							</label>
							<select
								id={parentId}
								value={parentToAdd}
								onChange={(event) => setParentChoice(event.target.value)}
								className={controlClass}
							>
								<option value="">Choose…</option>
								{possibleParents.map((name) => (
									<option key={name} value={name}>
										{name}
									</option>
								))}
							</select>
						</div>
						<Button
							type="submit"
							disabled={parentToAdd === ""}
							aria-label={`Add chosen parent to ${label}`}
						>
							Add
						</Button>
					</form>
				)}
			</div>
		</li>
	);
}
