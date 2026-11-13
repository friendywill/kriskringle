import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { Family } from "../../types/families";
import { FamilyList } from "./FamilyList";

const PEOPLE = ["Anna", "Ben", "Cara", "Dev"];
const SMITHS: Family = { parents: ["Anna", "Ben"], kids: ["Tom", "Lily"] };

type HarnessProps = {
	initial?: Family[];
	isSaving?: boolean;
	onSaved?: (families: Family[]) => void;
};

/** Holds families in state, the way the route's loader data does. */
function Harness({ initial = [], isSaving = true, onSaved }: HarnessProps) {
	const [families, setFamilies] = useState(initial);
	return (
		<FamilyList
			participants={PEOPLE}
			families={families}
			onChange={(next) => {
				setFamilies(next);
				onSaved?.(next);
				return isSaving;
			}}
		/>
	);
}

function chips(listName: string): string[] {
	const list = screen.queryByRole("list", { name: listName });
	if (list === null) return [];
	return within(list)
		.getAllByRole("listitem")
		.map((item) => item.textContent?.replace("×", "") ?? "");
}

describe("FamilyList", () => {
	it("adds a family from its kids' names", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.type(
			screen.getByLabelText("New family's kids"),
			"Tom, Lily{Enter}",
		);

		expect(
			screen.getByRole("heading", { name: "Family of Tom, Lily" }),
		).toBeInTheDocument();
		expect(chips("Kids in Family of Tom, Lily")).toEqual(["Tom", "Lily"]);
		expect(screen.getByText(/no parents set/i)).toBeInTheDocument();
	});

	it("adds and removes parents chosen from the people list", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[{ parents: [], kids: ["Max"] }]} />);
		const parentSelect = screen.getByLabelText("Add parent to Family of Max");

		await user.selectOptions(parentSelect, "Cara");
		await user.click(
			screen.getByRole("button", {
				name: "Add chosen parent to Family of Max",
			}),
		);
		await user.selectOptions(parentSelect, "Dev");
		await user.click(
			screen.getByRole("button", {
				name: "Add chosen parent to Family of Max",
			}),
		);

		expect(chips("Parents in Family of Max")).toEqual(["Cara", "Dev"]);
		expect(
			within(parentSelect)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual(["Choose…", "Anna", "Ben"]);

		await user.click(
			screen.getByRole("button", {
				name: "Remove Cara as a parent in Family of Max",
			}),
		);

		expect(chips("Parents in Family of Max")).toEqual(["Dev"]);
	});

	it("adds more kids to an existing family", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[SMITHS]} />);

		await user.type(
			screen.getByLabelText("Add kids to Family of Tom, Lily"),
			"Zoe{Enter}",
		);

		expect(chips("Kids in Family of Tom, Lily, Zoe")).toEqual([
			"Tom",
			"Lily",
			"Zoe",
		]);
	});

	it("skips a child who is already in another family", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[SMITHS]} />);

		await user.type(
			screen.getByLabelText("New family's kids"),
			"tom, Max{Enter}",
		);

		expect(screen.getByRole("status")).toHaveTextContent(/skipped.*tom/i);
		expect(
			screen.getByRole("heading", { name: "Family of Max" }),
		).toBeInTheDocument();
	});

	it("removes a family, and a family whose last child is removed", async () => {
		const user = userEvent.setup();
		render(
			<Harness initial={[SMITHS, { parents: ["Cara"], kids: ["Max"] }]} />,
		);

		await user.click(
			screen.getByRole("button", { name: "Remove Family of Tom, Lily" }),
		);
		await user.click(screen.getByRole("button", { name: "Remove Max" }));

		expect(screen.queryByRole("list", { name: "Families" })).toBeNull();
	});

	it("warns when the families could not be saved", async () => {
		const user = userEvent.setup();
		render(<Harness isSaving={false} />);

		await user.type(screen.getByLabelText("New family's kids"), "Tom{Enter}");

		expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save/i);
	});
});
