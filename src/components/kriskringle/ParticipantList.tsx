import { type SubmitEvent, useId, useRef, useState } from "react";
import { addParticipants } from "../../lib/utils";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { controlClass, labelClass } from "../ui/controlClass";
import { StorageErrorAlert } from "./StorageErrorAlert";

type ParticipantListProps = {
	participants: readonly string[];
	/** Persists the new list and returns whether it was saved. */
	onChange: (participants: string[]) => boolean;
};

export function ParticipantList({
	participants,
	onChange,
}: ParticipantListProps) {
	const [draft, setDraft] = useState("");
	const [skipped, setSkipped] = useState<string[]>([]);
	const [hasSaveError, setHasSaveError] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const inputId = useId();
	const hintId = useId();

	const commit = (next: string[]) => {
		setHasSaveError(!onChange(next));
	};

	const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = addParticipants(participants, draft);
		setSkipped(result.skipped);
		setDraft("");
		if (result.participants.length > participants.length) {
			commit(result.participants);
		}
	};

	const handleRemove = (name: string) => {
		setSkipped([]);
		commit(participants.filter((participant) => participant !== name));
		// The removed button is gone; keep keyboard focus somewhere useful.
		inputRef.current?.focus();
	};

	return (
		<>
			<form onSubmit={handleSubmit} className="flex items-end gap-2">
				<div className="flex-1">
					<label htmlFor={inputId} className={labelClass}>
						Add people
					</label>
					<input
						ref={inputRef}
						id={inputId}
						type="text"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						aria-describedby={hintId}
						autoComplete="off"
						className={controlClass}
					/>
				</div>
				<Button type="submit">Add</Button>
			</form>
			<p id={hintId} className="text-sm text-ink-muted">
				Separate several names with commas.
			</p>

			{skipped.length > 0 && (
				<Alert tone="info">
					Skipped (already on the list, or too long): {skipped.join(", ")}
				</Alert>
			)}
			{hasSaveError && <StorageErrorAlert />}

			{participants.length === 0 ? (
				<p className="text-sm text-ink-muted">
					Nobody yet. Add at least two people to draw names.
				</p>
			) : (
				<ul aria-label="People taking part" className="flex flex-wrap gap-2">
					{participants.map((name) => (
						<li
							key={name}
							className="flex items-center gap-1 rounded-full border border-line bg-canvas py-1 pr-1 pl-3 text-sm"
						>
							{name}
							<button
								type="button"
								onClick={() => handleRemove(name)}
								aria-label={`Remove ${name}`}
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
