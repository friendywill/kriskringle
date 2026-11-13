import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { HistoryEntry } from "../../types/history";
import { HistoryEditor } from "./HistoryEditor";

const PEOPLE = ["Alice", "Bob", "Carol", "Dan"];

const HISTORY: HistoryEntry[] = [
	{ year: 2024, giver: "Alice", receiver: "Bob" },
	{ year: 2024, giver: "Bob", receiver: "Alice" },
];

type EditorProps = Parameters<typeof HistoryEditor>[0];

/** Holds the people list in state, the way the route's loader data does. */
function Harness({
	history = [],
	people = PEOPLE,
	kids,
	onSave = () => true,
	onAddPeople = () => true,
}: Partial<EditorProps>) {
	const [list, setList] = useState(people);
	return (
		<HistoryEditor
			title="Kris Kringle"
			fieldLabel="Past pairings"
			history={history}
			people={list}
			{...(kids === undefined ? {} : { kids })}
			onSave={onSave}
			onAddPeople={(names) => {
				const isSaved = onAddPeople(names);
				if (isSaved) setList([...list, ...names]);
				return isSaved;
			}}
		/>
	);
}

function editor() {
	return screen.getByLabelText("Past pairings");
}

function saveButton() {
	return screen.getByRole("button", { name: "Save history" });
}

/** Replaces the editor's text the way a paste over a selection would. */
async function pasteText(
	user: ReturnType<typeof userEvent.setup>,
	text: string,
) {
	await user.clear(editor());
	await user.click(editor());
	await user.paste(text);
}

describe("HistoryEditor", () => {
	it("shows saved history as editable text and as a table", () => {
		render(<Harness history={HISTORY} />);

		expect(editor()).toHaveValue("2024\nAlice -> Bob\nBob -> Alice");
		const table = screen.getByRole("table", {
			name: "Who gave to whom in 2024",
		});
		expect(within(table).getAllByRole("row")).toHaveLength(3);
		expect(saveButton()).toBeDisabled();
	});

	it("invites a paste when there is no history", () => {
		render(<Harness />);

		expect(editor()).toHaveValue("");
		expect(screen.getByText(/no history yet/i)).toBeInTheDocument();
	});

	it("previews and saves a pasted chat announcement", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(() => true);
		render(<Harness onSave={onSave} />);

		await pasteText(
			user,
			"🎄 Kris Kringle 2023 🎄\nCarol → Dan\n• Dan gives to Carol",
		);

		expect(
			screen.getByRole("table", { name: "Who gave to whom in 2023" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Preview (not saved yet)" }),
		).toBeInTheDocument();

		await user.click(saveButton());

		expect(onSave).toHaveBeenCalledExactlyOnceWith([
			{ year: 2023, giver: "Carol", receiver: "Dan" },
			{ year: 2023, giver: "Dan", receiver: "Carol" },
		]);
		expect(screen.getByRole("status")).toHaveTextContent("History saved.");
		expect(editor()).toHaveValue("2023\nCarol -> Dan\nDan -> Carol");
		expect(saveButton()).toBeDisabled();
	});

	it("lists problem lines and blocks saving until they are fixed", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(() => true);
		render(<Harness onSave={onSave} />);

		await pasteText(user, "2023\nhello everyone\nCarol -> Dan");

		expect(screen.getByText(/1 line has a problem/i)).toBeInTheDocument();
		expect(screen.getByText(/line 2:/i)).toHaveTextContent("hello everyone");
		expect(editor()).toBeInvalid();
		expect(saveButton()).toBeDisabled();

		await user.click(
			screen.getByRole("button", { name: "Remove these lines" }),
		);

		expect(editor()).toHaveValue("2023\nCarol -> Dan");
		expect(screen.queryByText(/has a problem/i)).not.toBeInTheDocument();

		await user.click(saveButton());

		expect(onSave).toHaveBeenCalledExactlyOnceWith([
			{ year: 2023, giver: "Carol", receiver: "Dan" },
		]);
	});

	describe("people list", () => {
		it("flags a name that is not on the list and blocks saving", async () => {
			const user = userEvent.setup();
			render(<Harness people={["William", "Sarah"]} />);

			await pasteText(user, "2023\nWill -> Sarah\nSarah -> William");

			expect(screen.getByText(/line 2:/i)).toHaveTextContent(
				"Not on the people list: Will.",
			);
			expect(editor()).toBeInvalid();
			expect(saveButton()).toBeDisabled();
			expect(
				within(screen.getByRole("table")).queryByText("Will"),
			).not.toBeInTheDocument();
		});

		it("accepts the name once it is added to the list", async () => {
			const user = userEvent.setup();
			const onAddPeople = vi.fn(() => true);
			const onSave = vi.fn(() => true);
			render(
				<Harness
					people={["William", "Sarah"]}
					onAddPeople={onAddPeople}
					onSave={onSave}
				/>,
			);
			await pasteText(user, "2023\nWill -> Sarah");

			await user.click(screen.getByRole("button", { name: "Add Will" }));

			expect(onAddPeople).toHaveBeenCalledExactlyOnceWith(["Will"]);
			expect(screen.queryByText(/has a problem/i)).not.toBeInTheDocument();
			expect(editor()).toHaveValue("2023\nWill -> Sarah");

			await user.click(saveButton());

			expect(onSave).toHaveBeenCalledExactlyOnceWith([
				{ year: 2023, giver: "Will", receiver: "Sarah" },
			]);
		});

		it("offers to add several unknown names at once", async () => {
			const user = userEvent.setup();
			const onAddPeople = vi.fn(() => true);
			render(<Harness people={[]} onAddPeople={onAddPeople} />);
			await pasteText(user, "2023\nZed -> Yan\nYan -> Zed");

			await user.click(screen.getByRole("button", { name: "Add all 2" }));

			expect(onAddPeople).toHaveBeenCalledExactlyOnceWith(["Zed", "Yan"]);
			expect(screen.queryByText(/have problems/i)).not.toBeInTheDocument();
		});

		it("does not offer to add names when the only problems are unreadable lines", async () => {
			const user = userEvent.setup();
			render(<Harness />);

			await pasteText(user, "2023\nhello everyone");

			expect(
				screen.queryByRole("button", { name: /^Add / }),
			).not.toBeInTheDocument();
		});

		it("flags saved history that names someone no longer on the list", () => {
			render(<Harness history={HISTORY} people={["Alice"]} />);

			expect(screen.getByText(/2 lines have problems/i)).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Add Bob" })).toBeEnabled();
		});

		it("saves pasted names in the list's spelling", async () => {
			const user = userEvent.setup();
			const onSave = vi.fn(() => true);
			render(<Harness onSave={onSave} />);
			await pasteText(user, "2023\nCAROL -> dan");

			await user.click(saveButton());

			expect(onSave).toHaveBeenCalledExactlyOnceWith([
				{ year: 2023, giver: "Carol", receiver: "Dan" },
			]);
		});

		it("warns when a name could not be added to the list", async () => {
			const user = userEvent.setup();
			render(<Harness people={[]} onAddPeople={() => false} />);
			await pasteText(user, "2023\nZed -> Yan");

			await user.click(screen.getByRole("button", { name: "Add Zed" }));

			expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save/i);
			expect(screen.getByRole("button", { name: "Add Zed" })).toBeEnabled();
		});
	});

	describe("kids' presents", () => {
		it("takes receivers from the kids list and givers from the people list", async () => {
			const user = userEvent.setup();
			const onSave = vi.fn(() => true);
			render(<Harness kids={["Tom", "Max"]} onSave={onSave} />);

			await pasteText(user, "Kids' presents 2025\nAlice -> Tom\nBob -> Carol");

			expect(screen.getByText(/line 3:/i)).toHaveTextContent(
				"Not a kid in any family: Carol.",
			);
			expect(
				screen.queryByRole("button", { name: /^Add / }),
			).not.toBeInTheDocument();

			await user.click(
				screen.getByRole("button", { name: "Remove these lines" }),
			);
			await user.click(saveButton());

			expect(onSave).toHaveBeenCalledExactlyOnceWith([
				{ year: 2025, giver: "Alice", receiver: "Tom" },
			]);
		});

		it("offers to add an unknown giver to the people list", async () => {
			const user = userEvent.setup();
			render(<Harness kids={["Tom"]} />);

			await pasteText(user, "2025\nZed -> Tom");

			expect(screen.getByRole("button", { name: "Add Zed" })).toBeEnabled();
		});
	});

	it("discards unsaved edits", async () => {
		const user = userEvent.setup();
		render(<Harness history={HISTORY} />);

		await pasteText(user, "2020\nCarol -> Dan");
		await user.click(screen.getByRole("button", { name: "Discard changes" }));

		expect(editor()).toHaveValue("2024\nAlice -> Bob\nBob -> Alice");
		expect(
			screen.queryByRole("button", { name: "Discard changes" }),
		).not.toBeInTheDocument();
	});

	it("can clear all history by saving an empty editor", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(() => true);
		render(<Harness history={HISTORY} onSave={onSave} />);

		await user.clear(editor());
		await user.click(saveButton());

		expect(onSave).toHaveBeenCalledExactlyOnceWith([]);
	});

	it("warns and keeps the edits when saving fails", async () => {
		const user = userEvent.setup();
		render(<Harness onSave={() => false} />);

		await pasteText(user, "2023\nCarol -> Dan");
		await user.click(saveButton());

		expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save/i);
		expect(editor()).toHaveValue("2023\nCarol -> Dan");
		expect(saveButton()).toBeEnabled();
	});
});
