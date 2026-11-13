import { createFileRoute, useRouter } from "@tanstack/react-router";
import { HistoryEditor } from "../components/kriskringle/HistoryEditor";
import { loadHistory, saveHistory } from "../lib/storage";
import type { HistoryEntry } from "../types/history";

export const Route = createFileRoute("/history")({
	loader: () => ({ history: loadHistory() }),
	component: HistoryRoute,
});

function HistoryRoute() {
	const { history } = Route.useLoaderData();
	const router = useRouter();

	const handleSave = (entries: HistoryEntry[]) => {
		const isSaved = saveHistory(entries);
		void router.invalidate();
		return isSaved;
	};

	return <HistoryEditor history={history} onSave={handleSave} />;
}
