import { createFileRoute, useRouter } from "@tanstack/react-router";
import { KidsPanel } from "../components/kriskringle/KidsPanel";
import { replaceYear } from "../lib/history";
import {
	loadCouples,
	loadFamilies,
	loadKidsHistory,
	loadParticipants,
	saveFamilies,
	saveKidsHistory,
} from "../lib/storage";
import type { Assignment } from "../types/draw";
import type { Family } from "../types/families";

export const Route = createFileRoute("/kids")({
	loader: () => ({
		participants: loadParticipants(),
		families: loadFamilies(),
		couples: loadCouples(),
		history: loadKidsHistory(),
	}),
	component: KidsRoute,
});

function KidsRoute() {
	const { participants, families, couples, history } = Route.useLoaderData();
	const router = useRouter();

	const handleFamiliesChange = (next: Family[]) => {
		const isSaved = saveFamilies(next);
		void router.invalidate();
		return isSaved;
	};

	const handleSaveDraw = (year: number, assignments: readonly Assignment[]) => {
		const isSaved = saveKidsHistory(replaceYear(history, year, assignments));
		void router.invalidate();
		return isSaved;
	};

	return (
		<KidsPanel
			participants={participants}
			families={families}
			couples={couples}
			history={history}
			onFamiliesChange={handleFamiliesChange}
			onSaveDraw={handleSaveDraw}
		/>
	);
}
