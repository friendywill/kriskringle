import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = Omit<ComponentProps<"button">, "className" | "type"> & {
	variant?: ButtonVariant;
	type?: "button" | "submit";
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
	primary: "bg-brand text-on-brand enabled:hover:bg-brand-strong",
	secondary:
		"border border-line-strong bg-surface text-ink enabled:hover:bg-canvas",
};

export function Button({
	variant = "primary",
	type = "button",
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]}`}
			{...props}
		/>
	);
}
