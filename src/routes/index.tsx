import { createFileRoute, useRouter } from "@tanstack/react-router";
import { DrawPanel } from "../components/kriskringle/DrawPanel";
import { pruneCouples } from "../lib/couples";
import { pruneParents } from "../lib/families";
import { replaceYear } from "../lib/history";
import {
	loadCouples,
	loadFamilies,
	loadHistory,
	loadParticipants,
	saveCouples,
	saveFamilies,
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
		families: loadFamilies(),
	}),
	component: DrawRoute,
});

function DrawRoute() {
	const { participants, history, couples, families } = Route.useLoaderData();
	const router = useRouter();

	const handleParticipantsChange = (next: string[]) => {
		// Someone leaving the list ends their couple and stops being a parent
		// in the kids' draw; their kids stay for the other adults.
		const isSaved =
			saveParticipants(next) &&
			saveCouples(pruneCouples(couples, next)) &&
			saveFamilies(pruneParents(families, next));
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
