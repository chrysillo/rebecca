import { type ReactNode, useState } from "react";

type PanelProps = {
	title: string;
	children: ReactNode;
	/** Adds an arrow in the header that shows/hides the panel body. */
	collapsible?: boolean;
	defaultOpen?: boolean;
};

/** A floating card. Used for every overlay panel; optionally collapsible. */
export function Panel({
	title,
	children,
	collapsible = false,
	defaultOpen = true,
}: PanelProps) {
	const [open, setOpen] = useState(defaultOpen);
	const showBody = !collapsible || open;

	return (
		<section className="w-60 rounded-lg border border-neutral-200 bg-white/95 p-3 shadow-sm backdrop-blur">
			{collapsible ? (
				<button
					type="button"
					className="flex w-full items-center gap-1.5 text-left"
					onClick={() => setOpen((o) => !o)}
					aria-expanded={open}
				>
					<span
						className={`inline-block text-[10px] text-neutral-500 transition-transform ${open ? "rotate-90" : ""}`}
					>
						▶
					</span>
					<PanelTitle>{title}</PanelTitle>
				</button>
			) : (
				<PanelTitle>{title}</PanelTitle>
			)}
			{showBody && <div className="mt-2 flex flex-col gap-3">{children}</div>}
		</section>
	);
}

function PanelTitle({ children }: { children: ReactNode }) {
	return (
		<h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
			{children}
		</h2>
	);
}

export function Group({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1">
			<h3 className="text-[11px] font-medium text-neutral-400">{title}</h3>
			{children}
		</div>
	);
}

export function Button({
	children,
	onClick,
	disabled,
}: {
	children: ReactNode;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			className="rounded border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs hover:bg-amber-50 disabled:opacity-40 disabled:hover:bg-neutral-50"
			onClick={onClick}
			disabled={disabled}
		>
			{children}
		</button>
	);
}
