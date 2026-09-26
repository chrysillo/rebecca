import { useEffect, useState } from "react";

type Props = {
	label: string;
	value: number;
	/** Called with a valid number when the user presses Enter or leaves the field. */
	onCommit?: (value: number) => void;
	/** Values must be strictly greater than this (e.g. 0 for dimensions). */
	greaterThan?: number;
	unit?: string;
	/** Shrinks the label to match a Group title (11px) instead of the normal 13px. */
	smallLabel?: boolean;
	/** Shrinks the value to 10px, matching the sizes in the object list. */
	smallValue?: boolean;
};

/** A numeric input that edits a draft and commits on Enter/blur. Escape reverts. Read-only without onCommit. */
export function NumberField({
	label,
	value,
	onCommit,
	greaterThan,
	unit,
	smallLabel = false,
	smallValue = false,
}: Props) {
	const display = formatNumber(value);
	const [draft, setDraft] = useState(display);
	useEffect(() => setDraft(display), [display]);

	const commit = () => {
		const parsed = Number(draft);
		const valid =
			draft.trim() !== "" &&
			Number.isFinite(parsed) &&
			(greaterThan === undefined || parsed > greaterThan);
		if (valid && onCommit) onCommit(parsed);
		else setDraft(display);
	};

	const readOnly = !onCommit;

	return (
		<label
			className={`grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-2 ${smallLabel ? "text-[11px]" : "text-[13px]"}`}
		>
			<span className={readOnly ? "text-neutral-400" : "text-neutral-600"}>
				{label}
			</span>
			<span className="relative block">
				<input
					className={`h-7 w-full rounded-md border px-2 text-right font-mono font-medium tabular-nums ${
						smallValue ? "text-[10px]" : "text-xs"
					} ${unit ? "pr-7" : ""} ${
						readOnly
							? "border-[#ececec] bg-transparent text-neutral-400"
							: "border-transparent bg-neutral-100 text-neutral-800 focus:border-amber-500 focus:bg-white focus:outline-none"
					}`}
					value={draft}
					readOnly={readOnly}
					inputMode="decimal"
					onChange={(e) => setDraft(e.target.value)}
					onBlur={commit}
					onKeyDown={(e) => {
						if (e.key === "Enter") e.currentTarget.blur();
						if (e.key === "Escape") {
							setDraft(display);
							// Blur after the revert has rendered, so blur commits the original value (a no-op).
							requestAnimationFrame(() => e.currentTarget?.blur());
						}
					}}
				/>
				{unit && (
					<span
						className={`pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 ${
							smallValue ? "text-[10px]" : "text-[11px]"
						} ${readOnly ? "text-neutral-300" : "text-neutral-400"}`}
					>
						{unit}
					</span>
				)}
			</span>
		</label>
	);
}

/** Up to 3 decimals, no trailing zeros. */
const formatNumber = (n: number) => String(Math.round(n * 1000) / 1000);
