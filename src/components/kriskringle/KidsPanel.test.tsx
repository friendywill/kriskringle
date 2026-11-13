import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Family } from "../../types/families";
import type { HistoryEntry } from "../../types/history";
import { KidsPanel } from "./KidsPanel";

const ADULTS = ["Anna", "Ben", "Cara", "Dev"];
const FAMILIES: Family[] = [
	{ parents: ["Anna", "Ben"], kids: ["Tom", "Lily"] },
	{ parents: ["Cara", "Dev"], kids: ["Max", "Zoe"] },
];
const OWN = new Set([
	"Anna>Tom",
	"Anna>Lily",
	"Ben>Tom",
	"Ben>Lily",
	"Cara>Max",
	"Cara>Zoe",
	"Dev>Max",
	"Dev>Zoe",
]);

type PanelProps = Partial<Parameters<typeof KidsPanel>[0]>;

function renderPanel(props: PanelProps = {}) {
	const onSaveDraw = vi.fn(() => true);
	const onFamiliesChange = vi.fn(() => true);
	render(
		<KidsPanel
			participants={ADULTS}
			families={FAMILIES}
			history={[]}
			onFamiliesChange={onFamiliesChange}
			onSaveDraw={onSaveDraw}
			{...props}
		/>,
	);
	return { onSaveDraw, onFamiliesChange, user: userEvent.setup() };
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

describe("KidsPanel", () => {
	it("gives every adult a child from another family", async () => {
		const { user } = renderPanel();

		await user.click(screen.getByRole("button", { name: "Draw kids" }));
		for (let attempt = 0; attempt < 10; attempt++) {
			const pairs = drawnPairs();
			expect(pairs.map((pair) => pair.split(">")[0])).toEqual(ADULTS);
			expect(pairs.filter((pair) => OWN.has(pair))).toEqual([]);
			await user.click(screen.getByRole("button", { name: "Draw again" }));
		}
	});

	it("titles the result and chat message as kids' presents", async () => {
		const { user } = renderPanel();
		await setYear(user, "2026");
		await user.click(screen.getByRole("button", { name: "Draw kids" }));

		await user.click(screen.getByRole("button", { name: "Copy for chat" }));

		expect(
			screen.getByRole("heading", { name: "Kids' presents 2026" }),
		).toBeInTheDocument();
		expect(await navigator.clipboard.readText()).toMatch(
			/^Kids' presents 2026\n/,
		);
	});

	it("saves the draw to the kids' history", async () => {
		const { user, onSaveDraw } = renderPanel();
		await setYear(user, "2026");
		await user.click(screen.getByRole("button", { name: "Draw kids" }));
		const pairs = drawnPairs();

		await user.click(screen.getByRole("button", { name: "Save to history" }));

		expect(onSaveDraw).toHaveBeenCalledExactlyOnceWith(
			2026,
			pairs.map((pair) => {
				const [giver, receiver] = pair.split(">");
				return { giver, receiver };
			}),
		);
	});

	it("avoids kids an adult bought for last year", async () => {
		const history: HistoryEntry[] = [
			{ year: 2025, giver: "Anna", receiver: "Max" },
			{ year: 2025, giver: "Ben", receiver: "Zoe" },
			{ year: 2025, giver: "Cara", receiver: "Tom" },
			{ year: 2025, giver: "Dev", receiver: "Lily" },
		];
		const { user } = renderPanel({ history });
		await setYear(user, "2026");

		await user.click(screen.getByRole("button", { name: "Draw kids" }));

		expect(drawnPairs()).toEqual([
			"Anna>Zoe",
			"Ben>Max",
			"Cara>Lily",
			"Dev>Tom",
		]);
		expect(screen.queryByText(/couldn't avoid/i)).not.toBeInTheDocument();
	});

	it("says which kids have no present when only their parents are adults", async () => {
		const { user } = renderPanel({
			participants: ["Anna", "Ben"],
			families: [FAMILIES[0] as Family],
		});

		await user.click(screen.getByRole("button", { name: "Draw kids" }));

		expect(
			screen.getByText(
				/no present for tom and lily: every adult is their parent/i,
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(/anna and ben have no child outside/i),
		).toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("explains that a repeat could not be avoided", async () => {
		const { user } = renderPanel({
			participants: ["Erin"],
			families: [{ parents: [], kids: ["Tom"] }],
			history: [{ year: 2025, giver: "Erin", receiver: "Tom" }],
		});
		await setYear(user, "2026");

		await user.click(screen.getByRole("button", { name: "Draw kids" }));

		expect(screen.getByText(/couldn't avoid/i)).toHaveTextContent("Erin (Tom)");
	});

	it("asks for families before drawing", async () => {
		const { user } = renderPanel({ families: [] });

		await user.click(screen.getByRole("button", { name: "Draw kids" }));

		expect(screen.getByRole("alert")).toHaveTextContent(/add a family/i);
	});

	it("asks for people before drawing", async () => {
		const { user } = renderPanel({ participants: [] });

		await user.click(screen.getByRole("button", { name: "Draw kids" }));

		expect(screen.getByRole("alert")).toHaveTextContent(/add people/i);
	});

	it("clears a draw once the families change", async () => {
		const { user, onFamiliesChange } = renderPanel();
		await user.click(screen.getByRole("button", { name: "Draw kids" }));

		await user.click(
			screen.getByRole("button", { name: "Remove Family of Max, Zoe" }),
		);

		expect(onFamiliesChange).toHaveBeenCalledExactlyOnceWith([FAMILIES[0]]);
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});
});
