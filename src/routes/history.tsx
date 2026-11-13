import { createFileRoute, useRouter } from "@tanstack/react-router";
import { HistoryEditor } from "../components/kriskringle/HistoryEditor";
import {
	loadHistory,
	loadParticipants,
	saveHistory,
	saveParticipants,
} from "../lib/storage";
import type { HistoryEntry } from "../types/history";

export const Route = createFileRoute("/history")({
	loader: () => ({
		history: loadHistory(),
		participants: loadParticipants(),
	}),
	component: HistoryRoute,
});

function HistoryRoute() {
	const { history, participants } = Route.useLoaderData();
	const router = useRouter();

	const handleSave = (entries: HistoryEntry[]) => {
		const isSaved = saveHistory(entries);
		void router.invalidate();
		return isSaved;
	};

	const handleAddPeople = (names: string[]) => {
		const isSaved = saveParticipants([...participants, ...names]);
		void router.invalidate();
		return isSaved;
	};

	return (
		<HistoryEditor
			history={history}
			people={participants}
			onSave={handleSave}
			onAddPeople={handleAddPeople}
		/>
	);
}
