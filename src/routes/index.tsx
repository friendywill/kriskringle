import { createFileRoute, useRouter } from "@tanstack/react-router";
import { DrawPanel } from "../components/kriskringle/DrawPanel";
import { pruneCouples } from "../lib/couples";
import { replaceYear } from "../lib/history";
import {
	loadCouples,
	loadHistory,
	loadParticipants,
	saveCouples,
	saveHistory,
	saveParticipants,
} from "../lib/storage";
import type { Couple } from "../types/couples";
import type { Assignment } from "../types/draw";

export const Route = createFileRoute("/")({
	loader: () => ({
		participants: loadParticipants(),
		history: loadHistory(),
		couples: loadCouples(),
	}),
	component: DrawRoute,
});

function DrawRoute() {
	const { participants, history, couples } = Route.useLoaderData();
	const router = useRouter();

	const handleParticipantsChange = (next: string[]) => {
		// Someone leaving the list ends their couple as well.
		const isSaved =
			saveParticipants(next) && saveCouples(pruneCouples(couples, next));
		void router.invalidate();
		return isSaved;
	};

	const handleCouplesChange = (next: Couple[]) => {
		const isSaved = saveCouples(next);
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
			couples={couples}
			onParticipantsChange={handleParticipantsChange}
			onCouplesChange={handleCouplesChange}
			onSaveDraw={handleSaveDraw}
		/>
	);
}
