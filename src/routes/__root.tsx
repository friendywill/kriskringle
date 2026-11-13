import { createRootRoute, Outlet } from "@tanstack/react-router";
import { NotFound } from "../components/kriskringle/NotFound";
import { SiteHeader } from "../components/kriskringle/SiteHeader";

export const Route = createRootRoute({
	component: RootLayout,
	notFoundComponent: NotFound,
});

function RootLayout() {
	return (
		<div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-6 sm:py-10">
			<SiteHeader />
			<main className="flex-1">
				<Outlet />
			</main>
			<footer className="text-sm text-ink-muted">
				Everything is stored in this browser only. Clearing site data removes
				it.
			</footer>
		</div>
	);
}
