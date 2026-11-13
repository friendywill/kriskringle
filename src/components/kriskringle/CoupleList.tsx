import { type SubmitEvent, useId, useState } from "react";
import { addCouple, unpairedPeople } from "../../lib/couples";
import type { Couple } from "../../types/couples";
import { Button } from "../ui/Button";
import { controlClass, labelClass } from "../ui/controlClass";
import { StorageErrorAlert } from "./StorageErrorAlert";

type CoupleListProps = {
	participants: readonly string[];
	couples: readonly Couple[];
	/** Persists the new couples and returns whether they were saved. */
	onChange: (couples: Couple[]) => boolean;
};

export function CoupleList({
	participants,
	couples,
	onChange,
}: CoupleListProps) {
	const [first, setFirst] = useState("");
	const [second, setSecond] = useState("");
	const [hasSaveError, setHasSaveError] = useState(false);
	const firstId = useId();
	const secondId = useId();

	// Only people who are not already in a couple can be picked. A choice
	// that stops being available (the person was removed) falls back to blank.
	const available = unpairedPeople(participants, couples);
	const firstChoice = available.includes(first) ? first : "";
	const secondOptions = available.filter((name) => name !== firstChoice);
	const secondChoice = secondOptions.includes(second) ? second : "";

	const commit = (next: Couple[]) => {
		setHasSaveError(!onChange(next));
	};

	const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const next = addCouple(couples, participants, firstChoice, secondChoice);
		if (next === null) return;
		setFirst("");
		setSecond("");
		commit(next);
	};

	return (
		<>
			<p className="text-sm text-ink-muted">
				Couples already buy for each other, so the draw never pairs them.
			</p>

			{available.length < 2 ? (
				<p className="text-sm text-ink-muted">
					{participants.length < 2
						? "Add people above before setting up couples."
						: "Everyone who can be paired up already is."}
				</p>
			) : (
				<form
					onSubmit={handleSubmit}
					className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
				>
					<div>
						<label htmlFor={firstId} className={labelClass}>
							Partner
						</label>
						<select
							id={firstId}
							required
							value={firstChoice}
							onChange={(event) => setFirst(event.target.value)}
							className={controlClass}
						>
							<option value="">Choose…</option>
							{available.map((name) => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
						</select>
					</div>
					<div>
						<label htmlFor={secondId} className={labelClass}>
							Other partner
						</label>
						<select
							id={secondId}
							required
							value={secondChoice}
							onChange={(event) => setSecond(event.target.value)}
							className={controlClass}
						>
							<option value="">Choose…</option>
							{secondOptions.map((name) => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
						</select>
					</div>
					<Button type="submit">Add couple</Button>
				</form>
			)}

			{hasSaveError && <StorageErrorAlert />}

			{couples.length > 0 && (
				<ul aria-label="Couples" className="flex flex-wrap gap-2">
					{couples.map(([one, other]) => (
						<li
							key={`${one}\u0000${other}`}
							className="flex items-center gap-1 rounded-full border border-line bg-canvas py-1 pr-1 pl-3 text-sm"
						>
							{one} &amp; {other}
							<button
								type="button"
								onClick={() => commit(couples.filter(([name]) => name !== one))}
								aria-label={`Remove couple ${one} and ${other}`}
								className="flex size-6 items-center justify-center rounded-full text-ink-muted hover:bg-danger-surface hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
							>
								<span aria-hidden="true">×</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</>
	);
}
