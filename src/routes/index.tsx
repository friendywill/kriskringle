import { createFileRoute, useRouter } from "@tanstack/react-router";
import { DrawPanel } from "../components/kriskringle/DrawPanel";
import { replaceYear } from "../lib/history";
import {
	loadHistory,
	loadParticipants,
	saveHistory,
	saveParticipants,
} from "../lib/storage";
import type { Assignment } from "../types/draw";

export const Route = createFileRoute("/")({
	loader: () => ({
		participants: loadParticipants(),
		history: loadHistory(),
	}),
	component: DrawRoute,
});

function DrawRoute() {
	const { participants, history } = Route.useLoaderData();
	const router = useRouter();

	const handleParticipantsChange = (next: string[]) => {
		const isSaved = saveParticipants(next);
		void router.invalidate();
		return isSaved;
	};

	const handleSaveDraw = (year: number, assignments: readonly Assignment[]) => {
		const isSaved = saveHistory(replaceYear(history, year, assignments));
		void router.invalidate();
		return isSaved;
	};

	return (
		<DrawPanel
			participants={participants}
			history={history}
			onParticipantsChange={handleParticipantsChange}
			onSaveDraw={handleSaveDraw}
		/>
	);
}
