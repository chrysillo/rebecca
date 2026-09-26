import { useId, useRef, useState } from "react";
import { commands } from "@/commands";
import { stockInUse } from "@/commands/stock";
import { newId } from "@/model/createPiece";
import { kindName } from "@/model/naming";
import { type Stock, stockOfKind } from "@/model/stock";
import type { Id, PieceKind } from "@/model/types";
import { applyCommand, useAppStore } from "@/state/store";
import { NumberField } from "@/ui/components/NumberField";
import { Group, Panel } from "@/ui/Panel";

/** The material a new sheet entry starts as. */
const DEFAULT_MATERIAL = "Plywood";

/** Offered while typing a sheet's material; any other name is fine too. */
const MATERIALS = ["Plywood", "OSB"];

/** Common sizes offered, in order, when adding a new entry (first one not already in the project). */
const SUGGESTED: { sheet: number[]; framing: [number, number][] } = {
	sheet: [18, 12, 9, 25, 6, 15],
	framing: [
		[38, 63],
		[45, 90],
		[45, 45],
		[38, 89],
		[70, 70],
	],
};

/**
 * The project's sheets (material and thickness) and framing sections. Editing a size resizes
 * every piece cut from it; an entry can only be removed once nothing uses it.
 */
export function StockPanel() {
	const stock = useAppStore((s) => s.doc.stock);
	const pieces = useAppStore((s) => s.doc.pieces);

	const section = (kind: PieceKind) => (
		<Group title={`${kindName(kind)} sizes`}>
			{stockOfKind(stock, kind).map((s) => (
				<StockRow key={s.id} stock={s} used={stockInUse(pieces, s.id)} />
			))}
			<button
				type="button"
				className="self-start text-xs font-medium text-neutral-700 hover:text-amber-700"
				onClick={() => applyCommand(commands.addStock(suggest(stock, kind)))}
			>
				+ Add {kindName(kind).toLowerCase()} size
			</button>
		</Group>
	);

	return (
		<Panel title="Stock" collapsible defaultOpen={false}>
			{section("sheet")}
			{section("framing")}
		</Panel>
	);
}

function StockRow({ stock, used }: { stock: Stock; used: number }) {
	const update = (size: Record<string, number>) =>
		applyCommand(commands.updateStock(stock.id, size));

	return (
		<div className="flex items-start gap-1">
			<div className="flex flex-1 flex-col gap-1.5">
				{stock.kind === "sheet" ? (
					<>
						<MaterialField
							value={stock.material}
							onCommit={(material) =>
								applyCommand(commands.setStockMaterial(stock.id, material))
							}
						/>
						<NumberField
							label="Thickness"
							value={stock.thickness}
							greaterThan={0}
							unit="mm"
							onCommit={(thickness) => update({ thickness })}
						/>
					</>
				) : (
					<>
						<NumberField
							label="Width"
							value={stock.width}
							greaterThan={0}
							unit="mm"
							onCommit={(width) => update({ width })}
						/>
						<NumberField
							label="Depth"
							value={stock.depth}
							greaterThan={0}
							unit="mm"
							onCommit={(depth) => update({ depth })}
						/>
					</>
				)}
				<span className="text-[11px] text-neutral-400">
					{used === 0
						? "Not used"
						: `Used by ${used} piece${used > 1 ? "s" : ""}`}
				</span>
			</div>
			<button
				type="button"
				className="px-1 text-sm leading-none text-neutral-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-neutral-400"
				disabled={used > 0}
				title={
					used > 0
						? "In use: change or delete its pieces first"
						: "Remove this size"
				}
				aria-label="Remove size"
				onClick={() => applyCommand(commands.removeStock(stock.id))}
			>
				×
			</button>
		</div>
	);
}

/** Picked from the dropdown to type a material that isn't listed. */
const OTHER = "__other__";

const FIELD_CLASS =
	"h-7 w-full rounded-md border border-transparent bg-neutral-100 px-2 text-xs font-medium text-neutral-800 focus:border-amber-500 focus:bg-white focus:outline-none";

/**
 * A sheet's material: a dropdown of common ones, plus "Other…" to type any name (Enter/blur
 * saves, Escape goes back to the dropdown). A custom name stays in the list once set.
 */
function MaterialField({
	value,
	onCommit,
}: {
	value: string;
	onCommit: (material: string) => void;
}) {
	const [typing, setTyping] = useState(false);
	const id = useId();
	const options = MATERIALS.includes(value) ? MATERIALS : [...MATERIALS, value];

	return (
		<div className="grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-2 text-[13px]">
			<label htmlFor={id} className="text-neutral-600">
				Material
			</label>
			{typing ? (
				<CustomMaterialInput
					id={id}
					onCommit={onCommit}
					onDone={() => setTyping(false)}
				/>
			) : (
				<select
					id={id}
					className={FIELD_CLASS}
					value={value}
					onChange={(e) => {
						if (e.target.value === OTHER) setTyping(true);
						else onCommit(e.target.value);
					}}
				>
					{options.map((m) => (
						<option key={m} value={m}>
							{m}
						</option>
					))}
					<option value={OTHER}>Other…</option>
				</select>
			)}
		</div>
	);
}

function CustomMaterialInput({
	id,
	onCommit,
	onDone,
}: {
	id: string;
	onCommit: (material: string) => void;
	onDone: () => void;
}) {
	const [draft, setDraft] = useState("");
	const cancelled = useRef(false);

	return (
		<input
			id={id}
			className={FIELD_CLASS}
			placeholder="Material"
			value={draft}
			// biome-ignore lint/a11y/noAutofocus: the field only appears when the user picks "Other…".
			autoFocus
			onChange={(e) => setDraft(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === "Enter") e.currentTarget.blur();
				if (e.key === "Escape") {
					cancelled.current = true;
					e.currentTarget.blur();
				}
			}}
			onBlur={() => {
				if (!cancelled.current && draft.trim()) onCommit(draft);
				onDone();
			}}
		/>
	);
}

/** A new entry with the first common size the project doesn't have yet (sheets: in plywood). */
function suggest(stock: Record<Id, Stock>, kind: PieceKind): Stock {
	if (kind === "sheet") {
		const have = new Set(
			stockOfKind(stock, "sheet")
				.filter((s) => s.material === DEFAULT_MATERIAL)
				.map((s) => s.thickness),
		);
		const thickness = SUGGESTED.sheet.find((t) => !have.has(t)) ?? 18;
		return { id: newId(), kind, material: DEFAULT_MATERIAL, thickness };
	}
	const have = new Set(
		stockOfKind(stock, "framing").map((s) => `${s.width}x${s.depth}`),
	);
	const [width, depth] = SUGGESTED.framing.find(
		([w, d]) => !have.has(`${w}x${d}`),
	) ?? [38, 63];
	return { id: newId(), kind, width, depth };
}
