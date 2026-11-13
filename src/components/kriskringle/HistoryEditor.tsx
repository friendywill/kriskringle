import { useId, useState } from "react";
import {
	dropErrorLines,
	groupByYear,
	parseHistory,
	serialiseHistory,
} from "../../lib/history";
import type { HistoryEntry } from "../../types/history";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { controlClass, labelClass } from "../ui/controlClass";
import { AssignmentTable } from "./AssignmentTable";
import { StorageErrorAlert } from "./StorageErrorAlert";

type HistoryEditorProps = {
	history: readonly HistoryEntry[];
	/** The people list. History may only name people who are on it. */
	people: readonly string[];
	/** Replaces the saved history and returns whether it was saved. */
	onSave: (entries: HistoryEntry[]) => boolean;
	/** Adds names to the people list and returns whether it was saved. */
	onAddPeople: (names: string[]) => boolean;
};

type SaveStatus = "idle" | "saved" | "failed";

export function HistoryEditor({
	history,
	people,
	onSave,
	onAddPeople,
}: HistoryEditorProps) {
	const [savedText, setSavedText] = useState(() => serialiseHistory(history));
	const [text, setText] = useState(savedText);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const textId = useId();
	const hintId = useId();
	const errorsId = useId();

	const { entries, errors, unknownNames } = parseHistory(text, people);
	const years = groupByYear(entries);
	const hasErrors = errors.length > 0;
	const isDirty = text !== savedText;

	const handleTextChange = (next: string) => {
		setText(next);
		setSaveStatus("idle");
	};

	const handleSave = () => {
		if (hasErrors) return;
		if (!onSave(entries)) {
			setSaveStatus("failed");
			return;
		}
		// Show the tidied-up version of what was just saved.
		const tidied = serialiseHistory(entries);
		setText(tidied);
		setSavedText(tidied);
		setSaveStatus("saved");
	};

	const handleAddPeople = (names: string[]) => {
		setSaveStatus(onAddPeople(names) ? "idle" : "failed");
	};

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold tracking-tight">History</h1>

			<Card title="Edit history">
				<div>
					<label htmlFor={textId} className={labelClass}>
						Past pairings
					</label>
					<textarea
						id={textId}
						value={text}
						onChange={(event) => handleTextChange(event.target.value)}
						rows={14}
						spellCheck={false}
						aria-invalid={hasErrors}
						aria-describedby={hasErrors ? `${hintId} ${errorsId}` : hintId}
						placeholder={"2025\nAlice -> Bob\nBob -> Carol\nCarol -> Alice"}
						className={`${controlClass} font-mono text-sm`}
					/>
				</div>
				<p id={hintId} className="text-sm text-ink-muted">
					Paste the announcement from your group chat, or type it in. Put the
					year on its own line, then one pairing per line, giver first — for
					example <code className="font-mono">Alice -&gt; Bob</code> or{" "}
					<code className="font-mono">Alice gives to Bob</code>. Names must
					match the people list.
				</p>

				{hasErrors && (
					<Alert tone="error" isAnnounced={false}>
						<div id={errorsId}>
							<p className="font-semibold">
								{errors.length === 1
									? "1 line has a problem. Fix or remove it before saving."
									: `${errors.length} lines have problems. Fix or remove them before saving.`}
							</p>
							<ul className="mt-2 space-y-1">
								{errors.map((error) => (
									<li key={error.line}>
										Line {error.line}:{" "}
										<q className="font-mono wrap-break-words">{error.text}</q> —{" "}
										{error.message}
									</li>
								))}
							</ul>
						</div>
						{unknownNames.length > 0 && (
							<div className="mt-3 space-y-2">
								<p>
									History can only name people on the list. If a name is a real
									person and not a misspelling, add it:
								</p>
								<div className="flex flex-wrap gap-2">
									{unknownNames.map((name) => (
										<Button
											key={name}
											variant="secondary"
											onClick={() => handleAddPeople([name])}
										>
											Add {name}
										</Button>
									))}
									{unknownNames.length > 1 && (
										<Button
											variant="secondary"
											onClick={() => handleAddPeople(unknownNames)}
										>
											Add all {unknownNames.length}
										</Button>
									)}
								</div>
							</div>
						)}
					</Alert>
				)}

				<div className="flex flex-wrap gap-2">
					<Button onClick={handleSave} disabled={hasErrors || !isDirty}>
						Save history
					</Button>
					{hasErrors && (
						<Button
							variant="secondary"
							onClick={() => handleTextChange(dropErrorLines(text, errors))}
						>
							Remove these lines
						</Button>
					)}
					{isDirty && (
						<Button
							variant="secondary"
							onClick={() => handleTextChange(savedText)}
						>
							Discard changes
						</Button>
					)}
				</div>

				{saveStatus === "saved" && <Alert tone="success">History saved.</Alert>}
				{saveStatus === "failed" && <StorageErrorAlert />}
			</Card>

			<Card title={isDirty ? "Preview (not saved yet)" : "Saved history"}>
				{years.length === 0 ? (
					<p className="text-sm text-ink-muted">
						No history yet. Paste a past year above to stop the draw repeating
						it.
					</p>
				) : (
					years.map(({ year, assignments }) => (
						<div key={year}>
							<h3 className="font-semibold">{year}</h3>
							<AssignmentTable
								caption={`Who gave to whom in ${year}`}
								assignments={assignments}
							/>
						</div>
					))
				)}
			</Card>
		</div>
	);
}
