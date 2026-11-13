import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Couple } from "../../types/couples";
import { CoupleList } from "./CoupleList";

const PEOPLE = ["Alice", "Bob", "Carol", "Dan", "Erin"];

type HarnessProps = {
	participants?: string[];
	initial?: Couple[];
	isSaving?: boolean;
};

/** Holds the couples in state, the way the route's loader data does. */
function Harness({
	participants = PEOPLE,
	initial = [],
	isSaving = true,
}: HarnessProps) {
	const [couples, setCouples] = useState(initial);
	return (
		<CoupleList
			participants={participants}
			couples={couples}
			onChange={(next) => {
				setCouples(next);
				return isSaving;
			}}
		/>
	);
}

function optionsOf(label: string): string[] {
	return within(screen.getByLabelText(label))
		.getAllByRole("option")
		.map((option) => option.textContent ?? "")
		.slice(1);
}

function listedCouples(): string[] {
	const list = screen.queryByRole("list", { name: "Couples" });
	if (list === null) return [];
	return within(list)
		.getAllByRole("listitem")
		.map((item) => item.textContent?.replace("×", "") ?? "");
}

async function addCouple(
	user: ReturnType<typeof userEvent.setup>,
	first: string,
	second: string,
) {
	await user.selectOptions(screen.getByLabelText("Partner"), first);
	await user.selectOptions(screen.getByLabelText("Other partner"), second);
	await user.click(screen.getByRole("button", { name: "Add couple" }));
}

describe("CoupleList", () => {
	it("adds a couple from two people on the list", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await addCouple(user, "Alice", "Bob");

		expect(listedCouples()).toEqual(["Alice & Bob"]);
	});

	it("only offers people who are not already in a couple", async () => {
		const user = userEvent.setup();
		render(<Harness initial={[["Alice", "Bob"]]} />);

		expect(optionsOf("Partner")).toEqual(["Carol", "Dan", "Erin"]);

		await user.selectOptions(screen.getByLabelText("Partner"), "Carol");

		expect(optionsOf("Other partner")).toEqual(["Dan", "Erin"]);
	});

	it("does not add a couple until both partners are chosen", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn(() => true);
		render(
			<CoupleList participants={PEOPLE} couples={[]} onChange={onChange} />,
		);

		await user.selectOptions(screen.getByLabelText("Partner"), "Alice");
		await user.click(screen.getByRole("button", { name: "Add couple" }));

		expect(onChange).not.toHaveBeenCalled();
	});

	it("removes a couple and makes both partners available again", async () => {
		const user = userEvent.setup();
		render(
			<Harness
				initial={[
					["Alice", "Bob"],
					["Carol", "Dan"],
				]}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Remove couple Alice and Bob" }),
		);

		expect(listedCouples()).toEqual(["Carol & Dan"]);
		expect(optionsOf("Partner")).toEqual(["Alice", "Bob", "Erin"]);
	});

	it("hides the form when fewer than two people are free to pair", () => {
		render(
			<Harness
				initial={[
					["Alice", "Bob"],
					["Carol", "Dan"],
				]}
			/>,
		);

		expect(
			screen.queryByRole("button", { name: "Add couple" }),
		).not.toBeInTheDocument();
		expect(screen.getByText(/already is/i)).toBeInTheDocument();
	});

	it("asks for people first when the list is too short", () => {
		render(<Harness participants={["Alice"]} />);

		expect(screen.getByText(/add people above/i)).toBeInTheDocument();
	});

	it("warns when the couples could not be saved", async () => {
		const user = userEvent.setup();
		render(<Harness isSaving={false} />);

		await addCouple(user, "Alice", "Bob");

		expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save/i);
	});
});
