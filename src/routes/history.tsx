import { createFileRoute, useRouter } from "@tanstack/react-router";
import { HistoryEditor } from "../components/kriskringle/HistoryEditor";
import { allKids } from "../lib/families";
import {
	loadFamilies,
	loadHistory,
	loadKidsHistory,
	loadParticipants,
	saveHistory,
	saveKidsHistory,
	saveParticipants,
} from "../lib/storage";
import type { HistoryEntry } from "../types/history";

export const Route = createFileRoute("/history")({
	loader: () => ({
		history: loadHistory(),
		kidsHistory: loadKidsHistory(),
		participants: loadParticipants(),
		kids: allKids(loadFamilies()),
	}),
	component: HistoryRoute,
});

function HistoryRoute() {
	const { history, kidsHistory, participants, kids } = Route.useLoaderData();
	const router = useRouter();

	const persist = (isSaved: boolean) => {
		void router.invalidate();
		return isSaved;
	};

	const handleAddPeople = (names: string[]) =>
		persist(saveParticipants([...participants, ...names]));

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold tracking-tight">History</h1>
			<HistoryEditor
				title="Kris Kringle"
				fieldLabel="Past pairings"
				history={history}
				people={participants}
				onSave={(entries: HistoryEntry[]) => persist(saveHistory(entries))}
				onAddPeople={handleAddPeople}
			/>
			<HistoryEditor
				title="Kids' presents"
				fieldLabel="Past kids' presents"
				history={kidsHistory}
				people={participants}
				kids={kids}
				onSave={(entries: HistoryEntry[]) => persist(saveKidsHistory(entries))}
				onAddPeople={handleAddPeople}
			/>
		</div>
	);
}
