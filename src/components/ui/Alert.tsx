import type { ReactNode } from "react";

type AlertTone = "error" | "success" | "info";

type AlertProps = {
	tone: AlertTone;
	/**
	 * Announce to screen readers when it appears. Turn off for messages that
	 * update while the user types, which would otherwise interrupt them.
	 */
	isAnnounced?: boolean;
	children: ReactNode;
};

const TONE_CLASSES: Record<AlertTone, string> = {
	error: "border-danger bg-danger-surface",
	success: "border-brand bg-success-surface",
	info: "border-line-strong bg-canvas",
};

export function Alert({ tone, isAnnounced = true, children }: AlertProps) {
	const liveRole = tone === "error" ? "alert" : "status";

	return (
		<div
			role={isAnnounced ? liveRole : undefined}
			className={`rounded-lg border px-4 py-3 text-sm text-ink ${TONE_CLASSES[tone]}`}
		>
			{children}
		</div>
	);
}
