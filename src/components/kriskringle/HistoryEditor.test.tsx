import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { HistoryEntry } from "../../types/history";
import { HistoryEditor } from "./HistoryEditor";

const HISTORY: HistoryEntry[] = [
	{ year: 2024, giver: "Alice", receiver: "Bob" },
	{ year: 2024, giver: "Bob", receiver: "Alice" },
];

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
		render(<HistoryEditor history={HISTORY} onSave={() => true} />);

		expect(editor()).toHaveValue("2024\nAlice -> Bob\nBob -> Alice");
		const table = screen.getByRole("table", {
			name: "Who gave to whom in 2024",
		});
		expect(within(table).getAllByRole("row")).toHaveLength(3);
		expect(saveButton()).toBeDisabled();
	});

	it("invites a paste when there is no history", () => {
		render(<HistoryEditor history={[]} onSave={() => true} />);

		expect(editor()).toHaveValue("");
		expect(screen.getByText(/no history yet/i)).toBeInTheDocument();
	});

	it("previews and saves a pasted chat announcement", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(() => true);
		render(<HistoryEditor history={[]} onSave={onSave} />);

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

	it("lists unreadable lines and blocks saving until they are fixed", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(() => true);
		render(<HistoryEditor history={[]} onSave={onSave} />);

		await pasteText(user, "2023\nhello everyone\nCarol -> Dan");

		expect(screen.getByText(/1 line can't be read/i)).toBeInTheDocument();
		expect(screen.getByText(/line 2:/i)).toHaveTextContent("hello everyone");
		expect(editor()).toBeInvalid();
		expect(saveButton()).toBeDisabled();

		await user.click(
			screen.getByRole("button", { name: "Remove unreadable lines" }),
		);

		expect(editor()).toHaveValue("2023\nCarol -> Dan");
		expect(screen.queryByText(/can't be read/i)).not.toBeInTheDocument();

		await user.click(saveButton());

		expect(onSave).toHaveBeenCalledExactlyOnceWith([
			{ year: 2023, giver: "Carol", receiver: "Dan" },
		]);
	});

	it("discards unsaved edits", async () => {
		const user = userEvent.setup();
		render(<HistoryEditor history={HISTORY} onSave={() => true} />);

		await pasteText(user, "2020\nZed -> Yan");
		await user.click(screen.getByRole("button", { name: "Discard changes" }));

		expect(editor()).toHaveValue("2024\nAlice -> Bob\nBob -> Alice");
		expect(
			screen.queryByRole("button", { name: "Discard changes" }),
		).not.toBeInTheDocument();
	});

	it("can clear all history by saving an empty editor", async () => {
		const user = userEvent.setup();
		const onSave = vi.fn(() => true);
		render(<HistoryEditor history={HISTORY} onSave={onSave} />);

		await user.clear(editor());
		await user.click(saveButton());

		expect(onSave).toHaveBeenCalledExactlyOnceWith([]);
	});

	it("warns and keeps the edits when saving fails", async () => {
		const user = userEvent.setup();
		render(<HistoryEditor history={[]} onSave={() => false} />);

		await pasteText(user, "2023\nCarol -> Dan");
		await user.click(saveButton());

		expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save/i);
		expect(editor()).toHaveValue("2023\nCarol -> Dan");
		expect(saveButton()).toBeEnabled();
	});
});
