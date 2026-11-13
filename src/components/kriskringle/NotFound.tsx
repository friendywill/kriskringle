import { Link } from "@tanstack/react-router";

export function NotFound() {
	return (
		<div className="space-y-3">
			<h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
			<p className="text-ink-muted">There's nothing at this address.</p>
			<p>
				<Link
					to="/"
					className="font-semibold text-brand underline underline-offset-4 hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
				>
					Back to the draw
				</Link>
			</p>
		</div>
	);
}
