import { type ReactNode, useId } from "react";

type CardProps = {
	title: string;
	children: ReactNode;
};

/** A titled section of the page. The title is the section's heading. */
export function Card({ title, children }: CardProps) {
	const headingId = useId();

	return (
		<section
			aria-labelledby={headingId}
			className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6"
		>
			<h2 id={headingId} className="text-lg font-semibold">
				{title}
			</h2>
			<div className="mt-4 space-y-4">{children}</div>
		</section>
	);
}
