import { useState } from "react";
import { formatAnnouncement } from "../../lib/history";
import type { Assignment } from "../../types/draw";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { AssignmentTable } from "./AssignmentTable";
import { StorageErrorAlert } from "./StorageErrorAlert";

type DrawResultProps = {
	year: number;
	assignments: readonly Assignment[];
	/** History already holds this year, so saving overwrites it. */
	isReplacing: boolean;
	/** Saves the draw to history and returns whether it was saved. */
	onSave: () => boolean;
};

type SaveStatus = "unsaved" | "saved" | "failed";
type CopyStatus = "idle" | "copied" | "failed";

export function DrawResult({
	year,
	assignments,
	isReplacing,
	onSave,
}: DrawResultProps) {
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("unsaved");
	const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

	const handleSave = () => {
		setSaveStatus(onSave() ? "saved" : "failed");
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(
				formatAnnouncement(year, assignments),
			);
			setCopyStatus("copied");
		} catch {
			setCopyStatus("failed");
		}
	};

	return (
		<Card title={`Kris Kringle ${year}`}>
			<AssignmentTable
				caption={`Who gives to whom in ${year}`}
				assignments={assignments}
			/>

			{saveStatus !== "saved" && isReplacing && (
				<p className="text-sm text-ink-muted">
					History already has pairings for {year}. Saving replaces them.
				</p>
			)}

			<div className="flex flex-wrap gap-2">
				{saveStatus !== "saved" && (
					<Button onClick={handleSave}>
						{isReplacing ? `Replace ${year} in history` : "Save to history"}
					</Button>
				)}
				<Button variant="secondary" onClick={() => void handleCopy()}>
					Copy for chat
				</Button>
			</div>

			{saveStatus === "saved" && (
				<Alert tone="success">Saved {year} to history.</Alert>
			)}
			{saveStatus === "failed" && <StorageErrorAlert />}
			{copyStatus === "copied" && (
				<Alert tone="success">Copied. Paste it into your group chat.</Alert>
			)}
			{copyStatus === "failed" && (
				<Alert tone="error">
					Couldn't copy automatically. Select the pairings above and copy them
					by hand.
				</Alert>
			)}
		</Card>
	);
}
