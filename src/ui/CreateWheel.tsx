import { useMemo } from "react";
import { pieceName } from "@/model/naming";
import { orderedStock, type Stock, stockLabel } from "@/model/stock";
import { useAppStore } from "@/state/store";
import {
	cancelCreator,
	confirmCreate,
	cycle,
	highlight,
	resolveStock,
} from "@/tools/creatorSession";
import { RadialMenu } from "@/ui/components/RadialMenu";

const WHEEL_HINTS = [
	["R", "switch"],
	["Release R / click", "create"],
	["S / F", "sheet / timber"],
	["0–9", "type a size"],
	["Esc", "cancel"],
] as const;

/**
 * Weapon-wheel style chooser for new pieces. Opens at the cursor with the last-used kind preselected.
 * Point, scroll, press R / arrows / 1–2 to change; release R, click, Enter or Space to create.
 */
export function CreateWheel() {
	const creator = useAppStore((s) => s.creator);
	const stock = useAppStore((s) => s.doc.stock);
	const options = useMemo(() => orderedStock(stock), [stock]);
	if (!creator || options.length === 0) return null;
	// What confirm would create right now (a typed size may pick or add a different stock).
	const target = resolveStock();

	return (
		<RadialMenu
			label="Create a piece"
			at={creator.at}
			highlighted={creator.highlighted}
			onHighlight={highlight}
			onCycle={cycle}
			onConfirm={confirmCreate}
			onCancel={cancelCreator}
			slices={options.map((s) => ({
				id: s.id,
				content: (
					<>
						<StockSilhouette stock={s} />
						<span className="font-condensed text-sm font-semibold uppercase leading-none tracking-[0.12em] group-data-active:font-bold">
							{sliceTitle(s)}
						</span>
						<span className="font-mono text-[11px] leading-none tabular-nums text-neutral-500 group-data-active:font-medium group-data-active:text-amber-300">
							{stockLabel(s)}
						</span>
					</>
				),
			}))}
			centre={
				<>
					<span className="font-condensed text-xs font-semibold uppercase leading-none tracking-[0.16em] text-neutral-500">
						{target ? sliceTitle(target) : ""}
					</span>
					<span className="font-mono text-base font-semibold leading-none tabular-nums text-neutral-800">
						{creator.typed ? (
							<>
								{creator.typed}
								<span className="animate-pulse">▏</span>
								{target && !stock[target.id] && " (new)"}
							</>
						) : (
							target && stockLabel(target)
						)}
					</span>
				</>
			}
			hint={WHEEL_HINTS.map(([key, action]) => (
				<span key={key} className="flex items-center gap-1.5">
					<kbd className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-tight text-neutral-700">
						{key}
					</kbd>
					{action}
				</span>
			))}
		/>
	);
}

/** A sheet's material ("Plywood", "OSB"), so same-thickness sheets can be told apart; else "Timber". */
const sliceTitle = (s: Stock) =>
	s.kind === "sheet" ? s.material : pieceName(s.kind);

/** A block scaled to the stock's section: a thin board for sheets, an end-on post for framing. */
function StockSilhouette({ stock }: { stock: Stock }) {
	const [width, height] =
		stock.kind === "sheet"
			? [28, clamp(stock.thickness / 3, 2, 10)]
			: [clamp(stock.width / 4, 4, 24), clamp(stock.depth / 4, 4, 24)];
	return (
		<span
			className="rounded-[1px] bg-neutral-400 group-data-active:bg-amber-300"
			style={{ width, height }}
		/>
	);
}

const clamp = (v: number, lo: number, hi: number) =>
	Math.max(lo, Math.min(v, hi));
