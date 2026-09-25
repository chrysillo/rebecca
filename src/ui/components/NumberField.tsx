import { useEffect, useState } from "react";

type Props = {
	label: string;
	value: number;
	/** Called with a valid number when the user presses Enter or leaves the field. */
	onCommit?: (value: number) => void;
	/** Values must be strictly greater than this (e.g. 0 for dimensions). */
	greaterThan?: number;
	unit?: string;
};

/** A numeric input that edits a draft and commits on Enter/blur. Escape reverts. Read-only without onCommit. */
export function NumberField({
	label,
	value,
	onCommit,
	greaterThan,
	unit,
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
		<label className="flex items-center gap-2 text-xs">
			<span className="w-14 shrink-0 text-neutral-500">{label}</span>
			<input
				className={`w-full rounded border px-2 py-1 text-right tabular-nums ${
					readOnly
						? "border-transparent bg-neutral-100 text-neutral-500"
						: "border-neutral-300 bg-white focus:border-amber-500 focus:outline-none"
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
			{unit && <span className="w-6 text-neutral-400">{unit}</span>}
		</label>
	);
}

/** Up to 3 decimals, no trailing zeros. */
const formatNumber = (n: number) => String(Math.round(n * 1000) / 1000);
