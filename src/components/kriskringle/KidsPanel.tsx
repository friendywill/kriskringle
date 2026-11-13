import { type SubmitEvent, useId, useState } from "react";
import { drawKids } from "../../lib/kidsDraw";
import { createRng } from "../../lib/utils";
import type { Couple } from "../../types/couples";
import type { Assignment, KidsDrawResult } from "../../types/draw";
import type { Family } from "../../types/families";
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
import { DrawResult } from "./DrawResult";
import { FamilyList } from "./FamilyList";

type KidsPanelProps = {
	participants: readonly string[];
	families: readonly Family[];
	/** Partners never buy for the same child. */
	couples: readonly Couple[];
	history: readonly HistoryEntry[];
	/** Persists the families and returns whether they were saved. */
	onFamiliesChange: (families: Family[]) => boolean;
	/** Saves a draw to the kids' history and returns whether it was saved. */
	onSaveDraw: (year: number, assignments: readonly Assignment[]) => boolean;
};

type Draw = {
	year: number;
	seed: number;
	outcome: KidsDrawResult;
};

const FAILURE_MESSAGES = {
	"no-kids": "Add a family with at least one child before drawing.",
	"no-adults": "Add people on the Draw page before drawing.",
} as const;

function sentenceList(names: readonly string[]): string {
	if (names.length <= 1) return names.join("");
	return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function KidsPanel({
	participants,
	families,
	couples,
	history,
	onFamiliesChange,
	onSaveDraw,
}: KidsPanelProps) {
	const [yearText, setYearText] = useState(() =>
		String(new Date().getFullYear()),
	);
	const [draw, setDraw] = useState<Draw | null>(null);
	const yearId = useId();

	const handleFamiliesChange = (next: Family[]) => {
		// A draw for the old families no longer applies.
		setDraw(null);
		return onFamiliesChange(next);
	};

	const handleDraw = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault();
		const year = yearSchema.safeParse(Number(yearText));
		if (!year.success) return;

		const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
		setDraw({
			year: year.data,
			seed,
			outcome: drawKids({
				adults: participants,
				families,
				couples,
				history,
				year: year.data,
				rng: createRng(seed),
			}),
		});
	};

	const outcome = draw?.outcome;

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold tracking-tight">Kids' presents</h1>
			<p className="text-ink-muted">
				Every adult on the people list buys for one child from another family,
				including adults with no kids yet. Couples buy for different kids, and
				preferably not a child they've bought for before.
			</p>

			<Card title="Families">
				<FamilyList
					participants={participants}
					families={families}
					onChange={handleFamiliesChange}
				/>
			</Card>

			<Card title="This year's kids' draw">
				<form
					onSubmit={handleDraw}
					className="grid gap-4 sm:grid-cols-[7rem_auto] sm:items-end sm:justify-start"
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
					<Button type="submit">
						{draw === null ? "Draw kids" : "Draw again"}
					</Button>
				</form>

				{outcome !== undefined && !outcome.ok && (
					<Alert tone="error">{FAILURE_MESSAGES[outcome.reason]}</Alert>
				)}
				{outcome?.ok && outcome.kidsWithoutPresent.length > 0 && (
					<Alert tone="info">
						No present for {sentenceList(outcome.kidsWithoutPresent)}:{" "}
						{outcome.assignments.length === 0
							? "every adult is their parent."
							: "there aren't enough adults who aren't their parents."}
					</Alert>
				)}
				{outcome?.ok && outcome.adultsWithoutKid.length > 0 && (
					<Alert tone="info">
						{sentenceList(outcome.adultsWithoutKid)}{" "}
						{outcome.adultsWithoutKid.length === 1 ? "has" : "have"} no child to
						buy for: the only kids left are their own, or their partner's pick.
					</Alert>
				)}
				{outcome?.ok && outcome.repeats.length > 0 && (
					<Alert tone="info">
						Couldn't avoid repeating a child from an earlier year for:{" "}
						{sentenceList(
							outcome.repeats.map(
								({ giver, receiver }) => `${giver} (${receiver})`,
							),
						)}
						.
					</Alert>
				)}
			</Card>

			<div aria-live="polite">
				{draw?.outcome.ok && draw.outcome.assignments.length > 0 && (
					<DrawResult
						key={draw.seed}
						heading="Kids' presents"
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
