import { type ReactNode, useEffect, useRef, useState } from "react";
import { commands } from "@/commands";
import { type Group, groupOf } from "@/model/group";
import { identicalRuns, type Stock, stockSections } from "@/model/stock";
import type { Id, Piece } from "@/model/types";
import { applyCommand, useAppStore } from "@/state/store";
import {
	GroupRows,
	IdenticalRows,
	isAdding,
	PieceRow,
	StockRows,
} from "@/ui/outliner/OutlinerRows";
import { Panel } from "@/ui/Panel";

/** How long a revealed row stays highlighted, in ms. */
const FLASH_MS = 1400;

const toggle = (
	set: (update: (s: Set<string>) => Set<string>) => void,
	key: string,
) =>
	set((s) => {
		const next = new Set(s);
		if (!next.delete(key)) next.add(key);
		return next;
	});

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
