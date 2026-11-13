import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Couple } from "../../types/couples";
import type { HistoryEntry } from "../../types/history";
import { DrawPanel } from "./DrawPanel";

const TRIO = ["Alice", "Bob", "Carol"];

/** The only pairing left for the trio once this cycle has been used. */
const USED_CYCLE: HistoryEntry[] = [
	{ year: 2020, giver: "Alice", receiver: "Bob" },
	{ year: 2020, giver: "Bob", receiver: "Carol" },
	{ year: 2020, giver: "Carol", receiver: "Alice" },
];
const OTHER_CYCLE: HistoryEntry[] = [
	{ year: 2019, giver: "Alice", receiver: "Carol" },
	{ year: 2019, giver: "Bob", receiver: "Alice" },
	{ year: 2019, giver: "Carol", receiver: "Bob" },
];

type PanelProps = Partial<Parameters<typeof DrawPanel>[0]>;

function renderPanel(props: PanelProps = {}) {
	const onSaveDraw = vi.fn(() => true);
	const onParticipantsChange = vi.fn(() => true);
	const onCouplesChange = vi.fn(() => true);
	render(
		<DrawPanel
			participants={TRIO}
			history={[]}
			couples={[]}
			onParticipantsChange={onParticipantsChange}
			onCouplesChange={onCouplesChange}
			onSaveDraw={onSaveDraw}
			{...props}
		/>,
	);
	return {
		onSaveDraw,
		onParticipantsChange,
		onCouplesChange,
		user: userEvent.setup(),
	};
}

async function setYear(user: ReturnType<typeof userEvent.setup>, year: string) {
	const input = screen.getByLabelText("Year");
	await user.clear(input);
	await user.type(input, year);
}

function drawnPairs(): string[] {
	return within(screen.getByRole("table"))
		.getAllByRole("row")
		.slice(1)
		.map((row) => {
			const giver = within(row).getByRole("rowheader").textContent;
			const receiver = within(row).getByRole("cell").textContent;
			return `${giver}>${receiver}`;
		});
}

describe("DrawPanel", () => {
	it("defaults to the current year", () => {
		renderPanel();

		expect(screen.getByLabelText("Year")).toHaveValue(new Date().getFullYear());
	});

	it("draws a pairing for everyone", async () => {
		const { user } = renderPanel();

		await user.click(screen.getByRole("button", { name: "Draw names" }));

		const pairs = drawnPairs();
		expect(pairs.map((pair) => pair.split(">")[0])).toEqual(TRIO);
		expect(pairs.map((pair) => pair.split(">")[1]).sort()).toEqual(TRIO);
		expect(
			screen.getByRole("button", { name: "Draw again" }),
		).toBeInTheDocument();
	});

	it("never repeats a pairing from history", async () => {
		const { user } = renderPanel({ history: USED_CYCLE });
		await setYear(user, "2026");

		await user.click(screen.getByRole("button", { name: "Draw names" }));

		expect(drawnPairs()).toEqual(["Alice>Carol", "Bob>Alice", "Carol>Bob"]);
	});

	it("explains when history leaves no valid pairing, then lets the user relax the rule", async () => {
		const { user } = renderPanel({ history: [...USED_CYCLE, ...OTHER_CYCLE] });
		await setYear(user, "2026");

		await user.click(screen.getByRole("button", { name: "Draw names" }));

		expect(screen.getByRole("alert")).toHaveTextContent(
			/no way to pair everyone/i,
		);
		expect(screen.queryByRole("table")).not.toBeInTheDocument();

		await user.selectOptions(
			screen.getByLabelText("Avoid repeating pairings from"),
			"The last 5 years",
		);
		await user.click(screen.getByRole("button", { name: "Draw again" }));

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(drawnPairs()).toHaveLength(3);
	});

	it("asks for more people when fewer than two are listed", async () => {
		const { user } = renderPanel({ participants: ["Alice"] });

		await user.click(screen.getByRole("button", { name: "Draw names" }));

		expect(screen.getByRole("alert")).toHaveTextContent(/at least two people/i);
	});

	it("saves the draw to history for the chosen year", async () => {
		const { user, onSaveDraw } = renderPanel({ history: USED_CYCLE });
		await setYear(user, "2026");
		await user.click(screen.getByRole("button", { name: "Draw names" }));

		await user.click(screen.getByRole("button", { name: "Save to history" }));

		expect(onSaveDraw).toHaveBeenCalledExactlyOnceWith(2026, [
			{ giver: "Alice", receiver: "Carol" },
			{ giver: "Bob", receiver: "Alice" },
			{ giver: "Carol", receiver: "Bob" },
		]);
		expect(screen.getByText("Saved 2026 to history.")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /history$/i }),
		).not.toBeInTheDocument();
	});

	it("warns before replacing a year that is already in history", async () => {
		const { user } = renderPanel({ history: USED_CYCLE });
		await setYear(user, "2020");

		await user.click(screen.getByRole("button", { name: "Draw names" }));

		expect(
			screen.getByRole("button", { name: "Replace 2020 in history" }),
		).toBeInTheDocument();
		expect(screen.getByText(/saving replaces them/i)).toBeInTheDocument();
	});

	it("warns when the draw could not be saved", async () => {
		const { user } = renderPanel({ onSaveDraw: () => false });
		await user.click(screen.getByRole("button", { name: "Draw names" }));

		await user.click(screen.getByRole("button", { name: "Save to history" }));

		expect(screen.getByRole("alert")).toHaveTextContent(/couldn't save/i);
		expect(
			screen.getByRole("button", { name: "Save to history" }),
		).toBeInTheDocument();
	});

	it("copies a chat-ready announcement", async () => {
		const { user } = renderPanel({ history: USED_CYCLE });
		await setYear(user, "2026");
		await user.click(screen.getByRole("button", { name: "Draw names" }));

		await user.click(screen.getByRole("button", { name: "Copy for chat" }));

		expect(await screen.findByText(/copied/i)).toBeInTheDocument();
		expect(await navigator.clipboard.readText()).toBe(
			"Kris Kringle 2026\nAlice → Carol\nBob → Alice\nCarol → Bob",
		);
	});

	it("clears a draw once the people in it change", async () => {
		const { user, onParticipantsChange } = renderPanel();
		await user.click(screen.getByRole("button", { name: "Draw names" }));

		await user.click(screen.getByRole("button", { name: "Remove Carol" }));

		expect(onParticipantsChange).toHaveBeenCalledExactlyOnceWith([
			"Alice",
			"Bob",
		]);
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	describe("couples", () => {
		const FOUR = ["Alice", "Bob", "Carol", "Dan"];
		const COUPLES: Couple[] = [
			["Alice", "Bob"],
			["Carol", "Dan"],
		];

		it("never draws partners for each other", async () => {
			const { user } = renderPanel({ participants: FOUR, couples: COUPLES });
			const forbidden = ["Alice>Bob", "Bob>Alice", "Carol>Dan", "Dan>Carol"];

			await user.click(screen.getByRole("button", { name: "Draw names" }));
			for (let attempt = 0; attempt < 15; attempt++) {
				expect(drawnPairs()).toHaveLength(4);
				expect(drawnPairs().filter((pair) => forbidden.includes(pair))).toEqual(
					[],
				);
				await user.click(screen.getByRole("button", { name: "Draw again" }));
			}
		});

		it("explains when a couple makes the draw impossible", async () => {
			const { user } = renderPanel({ couples: [["Alice", "Bob"]] });

			await user.click(screen.getByRole("button", { name: "Draw names" }));

			expect(screen.getByRole("alert")).toHaveTextContent(/pairing a couple/i);
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});

		it("clears a draw once the couples change", async () => {
			const { user, onCouplesChange } = renderPanel({
				participants: FOUR,
				couples: COUPLES,
			});
			await user.click(screen.getByRole("button", { name: "Draw names" }));

			await user.click(
				screen.getByRole("button", { name: "Remove couple Alice and Bob" }),
			);

			expect(onCouplesChange).toHaveBeenCalledExactlyOnceWith([
				["Carol", "Dan"],
			]);
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});
	});

	it("does not draw for a year outside the supported range", async () => {
		const { user } = renderPanel();
		await setYear(user, "1492");

		await user.click(screen.getByRole("button", { name: "Draw names" }));

		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});
});
