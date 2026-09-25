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
		<section className="w-62 rounded-xl border border-black/6 bg-white/92 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_16px_rgba(0,0,0,0.05)] backdrop-blur-md p-3.5">
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
			{showBody && (
				<div className="mt-3.5 flex flex-col gap-3.5">{children}</div>
			)}
		</section>
	);
}

function PanelTitle({ children }: { children: ReactNode }) {
	return (
		<h2 className="font-condensed text-sm font-semibold uppercase leading-none tracking-[0.12em] text-neutral-600">
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
		<div className="flex flex-col gap-1.5">
			<h3 className="text-[11px] text-neutral-400">{title}</h3>
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
			className="h-7 rounded-md bg-neutral-100 px-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-40 disabled:hover:bg-neutral-100"
			onClick={onClick}
			disabled={disabled}
		>
			{children}
		</button>
	);
}
