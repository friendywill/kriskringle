import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ParticipantList } from "./ParticipantList";

/** Holds the list in state, the way the route's loader data does. */
function Harness({
	initial = [],
	isSaving = true,
}: {
	initial?: string[];
	isSaving?: boolean;
}) {
	const [participants, setParticipants] = useState(initial);
	return (
		<ParticipantList
			participants={participants}
			onChange={(next) => {
				setParticipants(next);
				return isSaving;
			}}
		/>
	);
}

function listedNames(): string[] {
	const list = screen.queryByRole("list", { name: "People taking part" });
	if (list === null) return [];
	return within(list)
		.getAllByRole("listitem")
		.map((item) => item.textContent?.replace("×", "") ?? "");
}

describe("ParticipantList", () => {
	it("prompts for people when the list is empty", () => {
		render(<Harness />);

		expect(screen.getByText(/add at least two people/i)).toBeInTheDocument();
		expect(listedNames()).toEqual([]);
	});

	it("adds a typed name and clears the field", async () => {
		const user = userEvent.setup();
		render(<Harness initial={["Alice"]} />);

		const input = screen.getByLabelText("Add people");
		await user.type(input, "Bob");
		await user.click(screen.getByRole("button", { name: "Add" }));

		expect(listedNames()).toEqual(["Alice", "Bob"]);
		expect(input).toHaveValue("");
	});

	it("adds a name when Enter is pressed", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.type(screen.getByLabelText("Add people"), "Alice{Enter}");

		expect(listedNames()).toEqual(["Alice"]);
	});

	it("adds several comma-separated names at once", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.type(
			screen.getByLabelText("Add people"),
			"Alice, Bob ,Carol{Enter}",
		);

		expect(listedNames()).toEqual(["Alice", "Bob", "Carol"]);
	});

	it("says which names it skipped as duplicates", async () => {
		const user = userEvent.setup();
		render(<Harness initial={["Alice"]} />);

		await user.type(screen.getByLabelText("Add people"), "alice, Bob{Enter}");

		expect(listedNames()).toEqual(["Alice", "Bob"]);
		expect(screen.getByRole("status")).toHaveTextContent(/skipped.*alice/i);
	});

	it("does not save when there is nothing new to add", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn(() => true);
		render(<ParticipantList participants={["Alice"]} onChange={onChange} />);

		await user.type(screen.getByLabelText("Add people"), "  , Alice{Enter}");

		expect(onChange).not.toHaveBeenCalled();
	});

	it("removes a person and returns focus to the name field", async () => {
		const user = userEvent.setup();
		render(<Harness initial={["Alice", "Bob"]} />);

		await user.click(screen.getByRole("button", { name: "Remove Alice" }));

		expect(listedNames()).toEqual(["Bob"]);
		expect(screen.getByLabelText("Add people")).toHaveFocus();
	});

	it("warns when the list could not be saved", async () => {
		const user = userEvent.setup();
		render(<Harness isSaving={false} />);

		await user.type(screen.getByLabelText("Add people"), "Alice{Enter}");

		expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save/i);
	});
});
