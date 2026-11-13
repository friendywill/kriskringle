import { type SubmitEvent, useId, useState } from "react";
import { drawAssignments } from "../../lib/draw";
import { groupByYear } from "../../lib/history";
import { createRng } from "../../lib/utils";
import type { Couple } from "../../types/couples";
import type {
	Assignment,
	DrawFailureReason,
	DrawResult as DrawOutcome,
} from "../../types/draw";
import {
	type HistoryEntry,
	MAX_YEAR,
	MIN_YEAR,
	yearSchema,
} from "../../types/history";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { controlClass, labelClass } from "../ui/controlClass";
import { CoupleList } from "./CoupleList";
import { DrawResult } from "./DrawResult";
import { ParticipantList } from "./ParticipantList";

type DrawPanelProps = {
	participants: readonly string[];
	history: readonly HistoryEntry[];
	couples: readonly Couple[];
	/** Persists the participant list and returns whether it was saved. */
	onParticipantsChange: (participants: string[]) => boolean;
	/** Persists the couples and returns whether they were saved. */
	onCouplesChange: (couples: Couple[]) => boolean;
	/** Saves a draw to history and returns whether it was saved. */
	onSaveDraw: (year: number, assignments: readonly Assignment[]) => boolean;
};

/** One press of the draw button: what was asked for and what came back. */
type Draw = {
	year: number;
	seed: number;
	outcome: DrawOutcome;
};

const ALL_YEARS = "all";

const LOOKBACK_OPTIONS = [
	{ value: ALL_YEARS, label: "Every previous year" },
	{ value: "5", label: "The last 5 years" },
	{ value: "3", label: "The last 3 years" },
	{ value: "2", label: "The last 2 years" },
	{ value: "1", label: "Last year only" },
	{ value: "0", label: "Nothing — ignore history" },
];

const FAILURE_MESSAGES: Record<DrawFailureReason, string> = {
	"too-few-participants": "Add at least two people before drawing names.",
	"duplicate-participants":
		"Someone is on the list twice. Remove the duplicate and draw again.",
	"no-valid-pairing":
		"There's no way to pair everyone without repeating a past pairing or pairing a couple. Avoid fewer years of history, or add more people.",
};

function describeHistory(history: readonly HistoryEntry[]): string {
	const years = groupByYear(history).map((group) => group.year);
	if (years.length === 0) {
		return "No history saved yet, so any pairing is allowed. Add past years on the History page.";
	}
	return `History on file: ${years.join(", ")}.`;
}

export function DrawPanel({
	participants,
	history,
	couples,
	onParticipantsChange,
	onCouplesChange,
	onSaveDraw,
}: DrawPanelProps) {
	const [yearText, setYearText] = useState(() =>
		String(new Date().getFullYear()),
	);
	const [lookback, setLookback] = useState(ALL_YEARS);
	const [draw, setDraw] = useState<Draw | null>(null);
	const yearId = useId();
	const lookbackId = useId();

	const handleParticipantsChange = (next: string[]) => {
		// A draw for the old list no longer applies.
		setDraw(null);
		return onParticipantsChange(next);
	};

	const handleCouplesChange = (next: Couple[]) => {
		// Nor does a draw made under the old couples.
		setDraw(null);
		return onCouplesChange(next);
	};

	const handleDraw = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const year = yearSchema.safeParse(Number(yearText));
		if (!year.success) return;

		// The seed is picked here, outside the pure draw, so a result can
		// always be reproduced from its inputs.
		const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
		setDraw({
			year: year.data,
			seed,
			outcome: drawAssignments({
				participants,
				history,
				couples,
				year: year.data,
				lookbackYears: lookback === ALL_YEARS ? null : Number(lookback),
				rng: createRng(seed),
			}),
		});
	};

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold tracking-tight">Draw names</h1>

			<Card title="Who's taking part">
				<ParticipantList
					participants={participants}
					onChange={handleParticipantsChange}
				/>
			</Card>

			<Card title="Couples">
				<CoupleList
					participants={participants}
					couples={couples}
					onChange={handleCouplesChange}
				/>
			</Card>

			<Card title="This year's draw">
				<form
					onSubmit={handleDraw}
					className="grid gap-4 sm:grid-cols-[7rem_1fr_auto] sm:items-end"
				>
					<div>
						<label htmlFor={yearId} className={labelClass}>
							Year
						</label>
						<input
							id={yearId}
							type="number"
							inputMode="numeric"
							required
							min={MIN_YEAR}
							max={MAX_YEAR}
							step={1}
							value={yearText}
							onChange={(event) => setYearText(event.target.value)}
							className={controlClass}
						/>
					</div>
					<div>
						<label htmlFor={lookbackId} className={labelClass}>
							Avoid repeating pairings from
						</label>
						<select
							id={lookbackId}
							value={lookback}
							onChange={(event) => setLookback(event.target.value)}
							className={controlClass}
						>
							{LOOKBACK_OPTIONS.map(({ value, label }) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</div>
					<Button type="submit">
						{draw === null ? "Draw names" : "Draw again"}
					</Button>
				</form>

				<p className="text-sm text-ink-muted">{describeHistory(history)}</p>

				{draw !== null && !draw.outcome.ok && (
					<Alert tone="error">{FAILURE_MESSAGES[draw.outcome.reason]}</Alert>
				)}
			</Card>

			<div aria-live="polite">
				{draw?.outcome.ok && (
					<DrawResult
						key={draw.seed}
						year={draw.year}
						assignments={draw.outcome.assignments}
						isReplacing={history.some((entry) => entry.year === draw.year)}
						onSave={() =>
							draw.outcome.ok && onSaveDraw(draw.year, draw.outcome.assignments)
						}
					/>
				)}
			</div>
		</div>
	);
}
