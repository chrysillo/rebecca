import { type MouseEvent, type ReactNode, useEffect, useRef } from "react";
import { stockColor } from "@/colors";
import { commands } from "@/commands";
import type { Group } from "@/model/group";
import { cutSizeLabel, type StockSection, stockLabel } from "@/model/stock";
import type { Piece, PieceKind } from "@/model/types";
import { applyCommand, useAppStore } from "@/state/store";
import { openContextMenu } from "@/tools/contextMenuSession";
import { RenameField } from "@/ui/components/RenameField";

/** The rows of the object list: group, stock section, identical-run and piece rows. */

/** Indent per tree level, in px. */
const INDENT = 12;

/** The object list calls framing "Timber": shorter, and all the header needs to say. */
const SECTION_NAME: Record<PieceKind, string> = {
	sheet: "Sheet",
	framing: "Timber",
};

/** Shift, ⌘ or Ctrl adds to the selection instead of replacing it. */
export const isAdding = (e: MouseEvent) => e.shiftKey || e.metaKey || e.ctrlKey;

const rowClass = (selected: boolean) =>
	`flex h-6.5 shrink-0 items-center gap-1.5 rounded-md pr-2 ${
		selected
			? "bg-amber-50 font-medium text-neutral-800"
			: "text-neutral-700 hover:bg-neutral-50"
	}`;

/** Left padding for a tree level, leaving room for the chevron column. */
const indent = (depth: number) => ({ paddingLeft: 6 + depth * INDENT });

function Chevron({
	collapsed,
	onClick,
	label,
}: {
	collapsed: boolean;
	onClick: () => void;
	label: string;
}) {
	return (
		<button
			type="button"
			aria-label={`${collapsed ? "Expand" : "Collapse"} ${label}`}
			aria-expanded={!collapsed}
			onClick={onClick}
			className="w-3 shrink-0 text-[10px] text-neutral-400 hover:text-neutral-700"
		>
			{collapsed ? "▸" : "▾"}
		</button>
	);
}

/** Right-aligned muted number: a count or a cut size. */
function Meta({ children }: { children: ReactNode }) {
	return (
		<span className="shrink-0 font-mono text-[10px] font-normal tabular-nums text-neutral-400">
			{children}
		</span>
	);
}

type GroupRowsProps = {
	group: Group;
	selected: boolean;
	collapsed: boolean;
	onToggleCollapsed: () => void;
	renaming: boolean;
	onRename: () => void;
	onRenameDone: () => void;
	children: ReactNode;
};

/** A group's header row (click selects the whole group), then its stock sections beneath. */
export function GroupRows({
	group,
	selected,
	collapsed,
	onToggleCollapsed,
	renaming,
	onRename,
	onRenameDone,
	children,
}: GroupRowsProps) {
	return (
		<>
			<li className={`${rowClass(selected)} text-xs`} style={indent(0)}>
				<Chevron
					collapsed={collapsed}
					onClick={onToggleCollapsed}
					label="group"
				/>
				{renaming ? (
					<RenameField
						value={group.name}
						onCommit={(name) =>
							applyCommand(commands.renameGroup(group.id, name))
						}
						onDone={onRenameDone}
					/>
				) : (
					<button
						type="button"
						className="flex min-w-0 flex-1 items-baseline justify-between gap-2 text-left font-semibold"
						onClick={(e) =>
							applyCommand(
								isAdding(e)
									? commands.toggleObject(group.pieceIds[0])
									: commands.selectObjects(group.pieceIds),
							)
						}
						onDoubleClick={onRename}
						title="Click to select the group, double-click to rename"
					>
						<span className="truncate">{group.name}</span>
						<Meta>{group.pieceIds.length}</Meta>
					</button>
				)}
			</li>
			{!collapsed && children}
		</>
	);
}

type StockRowsProps = {
	section: StockSection;
	depth: number;
	selected: boolean;
	collapsed: boolean;
	onToggleCollapsed: () => void;
	onSelect: (e: MouseEvent) => void;
	children: ReactNode;
};

/**
 * A stock size header, e.g. "Timber 38 × 63 · 12" or "OSB 18 mm · 3" (sheets show their
 * material), then its pieces. Clicking it selects all of them.
 */
export function StockRows({
	section,
	depth,
	selected,
	collapsed,
	onToggleCollapsed,
	onSelect,
	children,
}: StockRowsProps) {
	const { stock, pieces } = section;
	const title = stock.kind === "sheet" ? stock.material : SECTION_NAME.framing;
	return (
		<>
			<li className={`${rowClass(selected)} text-[11px]`} style={indent(depth)}>
				<Chevron
					collapsed={collapsed}
					onClick={onToggleCollapsed}
					label={`${title} ${stockLabel(stock)}`}
				/>
				<span
					className="h-2 w-2 shrink-0 rounded-[2px]"
					style={{ background: stockColor(stock) }}
				/>
				<button
					type="button"
					className="flex min-w-0 flex-1 items-baseline justify-between gap-2 text-left"
					onClick={onSelect}
					title={`Click to select every ${SECTION_NAME[stock.kind].toLowerCase()} of this stock (Shift/⌘ to add)`}
				>
					<span className="truncate">
						<span className="font-condensed font-semibold uppercase tracking-[0.08em] text-neutral-500">
							{title}
						</span>{" "}
						<span className="font-mono tabular-nums">{stockLabel(stock)}</span>
					</span>
					<Meta>{pieces.length}</Meta>
				</button>
			</li>
			{!collapsed && children}
		</>
	);
}

type PieceRowProps = {
	piece: Piece;
	depth: number;
	/** What sits in the chevron column; blank keeps names lined up with foldable rows. */
	leading?: ReactNode;
	selected: boolean;
	/** Just revealed via "Show in object list": highlighted for a moment and scrolled to. */
	flashing?: boolean;
	renaming: boolean;
	onRename: () => void;
	onRenameDone: () => void;
};

export function PieceRow({
	piece,
	depth,
	leading = <span className="w-3 shrink-0" />,
	selected,
	flashing = false,
	renaming,
	onRename,
	onRenameDone,
}: PieceRowProps) {
	const ref = useRef<HTMLLIElement>(null);
	// Scrolls into view once it's revealed — after the effect above unfolds an ancestor,
	// this row mounts already selected (or flashing).
	useEffect(() => {
		if (selected || flashing)
			ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
	}, [selected, flashing]);

	return (
		// Pointing at a row lights the piece up in the 3D view; right-click opens its menu there too.
		<li
			ref={ref}
			className={`${rowClass(selected)} text-xs transition-shadow duration-300 ${flashing ? "ring-2 ring-amber-400 ring-inset" : ""}`}
			style={indent(depth)}
			onPointerEnter={() => useAppStore.getState().setHovered(piece.id)}
			onPointerLeave={() => {
				const { hovered, setHovered } = useAppStore.getState();
				if (hovered === piece.id) setHovered(null);
			}}
			onContextMenu={(e) => {
				e.preventDefault();
				openContextMenu(piece.id, e.clientX, e.clientY);
			}}
		>
			{leading}
			{renaming ? (
				<RenameField
					value={piece.name}
					onCommit={(name) =>
						applyCommand(commands.renamePiece(piece.id, name))
					}
					onDone={onRenameDone}
				/>
			) : (
				<button
					type="button"
					className="flex min-w-0 flex-1 items-baseline justify-between gap-2 text-left"
					onClick={(e) =>
						applyCommand(
							isAdding(e)
								? commands.togglePiece(piece.id)
								: commands.selectPieces([piece.id]),
						)
					}
					onDoubleClick={onRename}
					title="Click to select (Shift/⌘ to add), double-click to rename"
				>
					<span className="truncate">{piece.name}</span>
					<Meta>{cutSizeLabel(piece)}</Meta>
				</button>
			)}
		</li>
	);
}

type IdenticalRowsProps = {
	piece: Piece;
	/** The run's distinct names, e.g. ["Framing 1", "base test 2"]. */
	names: string[];
	count: number;
	depth: number;
	selected: boolean;
	expanded: boolean;
	onToggleExpanded: () => void;
	onSelect: (e: MouseEvent) => void;
	children: ReactNode;
};

/** Several pieces of the same cut as one row, e.g. "Framing 1 · 724 ×6" (click selects them all); unfolds to each piece. */
export function IdenticalRows({
	piece,
	names,
	count,
	depth,
	selected,
	expanded,
	onToggleExpanded,
	onSelect,
	children,
}: IdenticalRowsProps) {
	return (
		<>
			<li className={`${rowClass(selected)} text-xs`} style={indent(depth)}>
				<Chevron
					collapsed={!expanded}
					onClick={onToggleExpanded}
					label={`${count} × ${names.join(", ")}`}
				/>
				<button
					type="button"
					className="flex min-w-0 flex-1 items-baseline justify-between gap-2 text-left"
					onClick={onSelect}
					title={`Click to select all ${count} (Shift/⌘ to add), arrow to list each`}
				>
					<span className="truncate">{names.join(", ")}</span>
					<Meta>
						{cutSizeLabel(piece)}{" "}
						<span className="text-neutral-600">×{count}</span>
					</Meta>
				</button>
			</li>
			{expanded && children}
		</>
	);
}
