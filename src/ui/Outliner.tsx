import {
	type MouseEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { commands } from "@/commands";
import { type Group, groupOf } from "@/model/group";
import {
	cutSizeLabel,
	identicalRuns,
	type Stock,
	type StockSection,
	stockLabel,
	stockSections,
} from "@/model/stock";
import type { Id, Piece, PieceKind } from "@/model/types";
import { applyCommand, useAppStore } from "@/state/store";
import { openContextMenu } from "@/tools/contextMenuSession";
import { RenameField } from "@/ui/components/RenameField";
import { Panel } from "@/ui/Panel";

/** How long a revealed row stays highlighted, in ms. */
const FLASH_MS = 1400;

/** Indent per tree level, in px. */
const INDENT = 12;

const SWATCH: Record<PieceKind, string> = {
	sheet: "bg-[#dcc196]",
	framing: "bg-[#c99a63]",
};

/** The object list calls framing "Timber": shorter, and all the header needs to say. */
const SECTION_NAME: Record<PieceKind, string> = {
	sheet: "Sheet",
	framing: "Timber",
};

const toggle = (
	set: (update: (s: Set<string>) => Set<string>) => void,
	key: string,
) =>
	set((s) => {
		const next = new Set(s);
		if (!next.delete(key)) next.add(key);
		return next;
	});

const isAdding = (e: MouseEvent) => e.shiftKey || e.metaKey || e.ctrlKey;

/** Where a piece sits in the tree: its group (if any), its stock section, and its identical-run fold (if any). */
function locate(
	pieces: Record<Id, Piece>,
	groups: Record<Id, Group>,
	stock: Record<Id, Stock>,
	id: Id,
): { groupId?: Id; sectionKey: string; runKey?: string } | null {
	if (!pieces[id]) return null;
	const group = groupOf(groups, id);
	const scope = group?.id ?? "loose";
	const scopePieces = group
		? group.pieceIds.map((pid) => pieces[pid]).filter((p): p is Piece => !!p)
		: Object.values(pieces).filter((p) => !groupOf(groups, p.id));
	const section = stockSections(scopePieces, stock).find((s) =>
		s.pieces.some((p) => p.id === id),
	);
	if (!section) return null;
	const sectionKey = `${scope}:${section.stock.id}`;
	const run = identicalRuns(section.pieces).find((r) =>
		r.some((p) => p.id === id),
	);
	const runKey =
		run && run.length > 1 ? `${sectionKey}:${run[0].id}` : undefined;
	return { groupId: group?.id, sectionKey, runKey };
}

/**
 * Left-hand tree of every piece: groups first, then loose pieces, each split by the stock
 * they're cut from (the cut list's sections). A stock header carries the section size, so
 * piece rows only show what varies: a timber length, or a sheet's length × width.
 * Click to select (Shift/⌘-click to add); double-click a name to rename; arrows collapse.
 */
export function Outliner() {
	const pieces = useAppStore((s) => s.doc.pieces);
	const stock = useAppStore((s) => s.doc.stock);
	const groups = useAppStore((s) => s.doc.groups);
	const selection = useAppStore((s) => s.doc.selection);
	const [renaming, setRenaming] = useState<Id | null>(null);
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
	/** Identical-piece rows start folded, so this tracks the opened ones. */
	const [expanded, setExpanded] = useState<Set<string>>(new Set());
	const list = Object.values(pieces);
	const grouped = new Set(Object.values(groups).flatMap((g) => g.pieceIds));

	// Read via a ref so this only re-runs when the selection itself changes, not on every
	// edit — otherwise re-collapsing a section the user just closed would keep popping back open.
	const latest = useRef({ pieces, groups, stock });
	latest.current = { pieces, groups, stock };
	/** Unfolds every level above a piece (group, stock section, identical run) so its row shows. */
	const unfoldTo = (id: Id) => {
		const { pieces, groups, stock } = latest.current;
		const loc = locate(pieces, groups, stock, id);
		if (!loc) return;
		const { groupId, sectionKey, runKey } = loc;
		setCollapsed((prev) => {
			const next = new Set(prev);
			next.delete(groupId ?? "");
			next.delete(sectionKey);
			return next.size === prev.size ? prev : next;
		});
		if (runKey)
			setExpanded((prev) =>
				prev.has(runKey) ? prev : new Set(prev).add(runKey),
			);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: unfoldTo reads the latest tree via a ref.
	useEffect(() => {
		// Only a single selected piece (e.g. clicked in the 3D view) reveals itself in the
		// tree — selecting a whole group/section/run at once shouldn't force its fold open.
		if (selection.length === 1) unfoldTo(selection[0]);
	}, [selection]);

	// "Show in object list" / "Rename": open the panel, unfold down to the piece, flash its row
	// (and start renaming it).
	const reveal = useAppStore((s) => s.reveal);
	const [panelOpen, setPanelOpen] = useState(true);
	const [flashing, setFlashing] = useState<Id | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: unfoldTo reads the latest tree via a ref.
	useEffect(() => {
		if (!reveal) return;
		setPanelOpen(true);
		unfoldTo(reveal.pieceId);
		setFlashing(reveal.pieceId);
		if (reveal.rename) setRenaming(reveal.pieceId);
		const timer = setTimeout(() => setFlashing(null), FLASH_MS);
		return () => clearTimeout(timer);
	}, [reveal]);

	const toggleCollapsed = (key: string) => toggle(setCollapsed, key);

	/** Stock headers and their pieces. `scope` keeps each group's collapse state separate. */
	const sections = (scope: string, sectionPieces: Piece[], depth: number) =>
		stockSections(sectionPieces, stock).map((section) => {
			const key = `${scope}:${section.stock.id}`;
			const ids = section.pieces.map((p) => p.id);
			return (
				<StockRows
					key={key}
					section={section}
					depth={depth}
					selected={ids.every((id) => selection.includes(id))}
					collapsed={collapsed.has(key)}
					onToggleCollapsed={() => toggleCollapsed(key)}
					onSelect={(e) =>
						applyCommand(
							commands.selectPieces(isAdding(e) ? [...selection, ...ids] : ids),
						)
					}
				>
					{identicalRuns(section.pieces).map((run) => {
						const first = run[0];
						const row = (
							piece: Piece,
							rowDepth: number,
							leading?: ReactNode,
						) => (
							<PieceRow
								key={piece.id}
								piece={piece}
								depth={rowDepth}
								leading={leading}
								selected={selection.includes(piece.id)}
								flashing={flashing === piece.id}
								renaming={renaming === piece.id}
								onRename={() => setRenaming(piece.id)}
								onRenameDone={() => setRenaming(null)}
							/>
						);
						if (run.length === 1) return row(first, depth + 1);
						const runKey = `${key}:${first.id}`;
						const runIds = run.map((p) => p.id);
						return (
							<IdenticalRows
								key={runKey}
								piece={first}
								names={[...new Set(run.map((p) => p.name))]}
								count={run.length}
								depth={depth + 1}
								selected={runIds.every((id) => selection.includes(id))}
								expanded={expanded.has(runKey)}
								onToggleExpanded={() => toggle(setExpanded, runKey)}
								onSelect={(e) =>
									applyCommand(
										commands.selectPieces(
											isAdding(e) ? [...selection, ...runIds] : runIds,
										),
									)
								}
							>
								{run.map((p) => row(p, depth + 2))}
							</IdenticalRows>
						);
					})}
				</StockRows>
			);
		});

	return (
		<Panel
			title={`Objects (${list.length})`}
			collapsible
			open={panelOpen}
			onOpenChange={setPanelOpen}
		>
			{list.length === 0 ? (
				<p className="text-xs text-neutral-400">
					Nothing yet. Add a sheet or timber.
				</p>
			) : (
				<ul className="-mx-1 flex max-h-[45vh] flex-col overflow-y-auto">
					{Object.values(groups).map((group) => (
						<GroupRows
							key={group.id}
							group={group}
							selected={group.pieceIds.every((id) => selection.includes(id))}
							collapsed={collapsed.has(group.id)}
							onToggleCollapsed={() => toggleCollapsed(group.id)}
							renaming={renaming === group.id}
							onRename={() => setRenaming(group.id)}
							onRenameDone={() => setRenaming(null)}
						>
							{sections(
								group.id,
								group.pieceIds.map((id) => pieces[id]).filter(Boolean),
								1,
							)}
						</GroupRows>
					))}
					{sections(
						"loose",
						list.filter((p) => !grouped.has(p.id)),
						0,
					)}
				</ul>
			)}
		</Panel>
	);
}

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
function GroupRows({
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

/** A stock size header, e.g. "Timber 38 × 63 · 12" (click selects all of them), then its pieces. */
function StockRows({
	section,
	depth,
	selected,
	collapsed,
	onToggleCollapsed,
	onSelect,
	children,
}: StockRowsProps) {
	const { stock, pieces } = section;
	return (
		<>
			<li className={`${rowClass(selected)} text-[11px]`} style={indent(depth)}>
				<Chevron
					collapsed={collapsed}
					onClick={onToggleCollapsed}
					label={`${SECTION_NAME[stock.kind]} ${stockLabel(stock)}`}
				/>
				<span
					className={`h-2 w-2 shrink-0 rounded-[2px] ${SWATCH[stock.kind]}`}
				/>
				<button
					type="button"
					className="flex min-w-0 flex-1 items-baseline justify-between gap-2 text-left"
					onClick={onSelect}
					title={`Click to select every ${SECTION_NAME[stock.kind].toLowerCase()} of this size (Shift/⌘ to add)`}
				>
					<span className="truncate">
						<span className="font-condensed font-semibold uppercase tracking-[0.08em] text-neutral-500">
							{SECTION_NAME[stock.kind]}
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

function PieceRow({
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
function IdenticalRows({
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
