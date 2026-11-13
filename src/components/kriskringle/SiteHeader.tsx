import { Link } from "@tanstack/react-router";

// The router marks the current page's link with aria-current="page".
const NAV_LINK_CLASS =
	"rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-sm";

export function SiteHeader() {
	return (
		<header className="flex flex-wrap items-center justify-between gap-3">
			<p className="text-xl font-bold tracking-tight">
				<span aria-hidden="true">🎁 </span>
				Kris Kringle
			</p>
			<nav aria-label="Main" className="flex gap-1">
				<Link to="/" activeOptions={{ exact: true }} className={NAV_LINK_CLASS}>
					Draw
				</Link>
				<Link to="/history" className={NAV_LINK_CLASS}>
					History
				</Link>
			</nav>
		</header>
	);
}
