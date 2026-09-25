import { type ReactNode, useState } from "react";
import { commands } from "@/commands";
import { dimensionEntries } from "@/model/dimensions";
import type { Group } from "@/model/group";
import { kindName } from "@/model/naming";
import type { Id, Piece } from "@/model/types";
import { applyCommand, useAppStore } from "@/state/store";
import { RenameField } from "@/ui/components/RenameField";
import { Panel } from "@/ui/Panel";

/** Left-hand list of every piece in the project. Click to select (Shift/⌘-click to add); double-click the name to rename. */
export function Outliner() {
	const pieces = useAppStore((s) => s.doc.pieces);
	const groups = useAppStore((s) => s.doc.groups);
	const selection = useAppStore((s) => s.doc.selection);
	const [renaming, setRenaming] = useState<Id | null>(null);
	const [collapsed, setCollapsed] = useState<Set<Id>>(new Set());
	const list = Object.values(pieces);
	const grouped = new Set(Object.values(groups).flatMap((g) => g.pieceIds));

	const pieceRow = (piece: Piece, indent = false) => (
		<Row
			key={piece.id}
			piece={piece}
			indent={indent}
			selected={selection.includes(piece.id)}
			renaming={renaming === piece.id}
			onRename={() => setRenaming(piece.id)}
			onRenameDone={() => setRenaming(null)}
		/>
	);
	const toggleCollapsed = (id: Id) =>
		setCollapsed((c) => {
			const next = new Set(c);
			if (!next.delete(id)) next.add(id);
			return next;
		});

	return (
		<Panel title={`Objects (${list.length})`} collapsible>
			{list.length === 0 ? (
				<p className="text-xs text-neutral-400">
					Nothing yet. Add a sheet or framing.
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
							{group.pieceIds
								.map((id) => pieces[id])
								.filter(Boolean)
								.map((p) => pieceRow(p, true))}
						</GroupRows>
					))}
					{list.filter((p) => !grouped.has(p.id)).map((p) => pieceRow(p))}
				</ul>
			)}
		</Panel>
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

/** A group's header row (click selects the whole group), then its pieces indented beneath. */
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
			<li
				className={`flex h-7.5 items-center gap-1.5 rounded-md px-2 text-[13px] ${
					selected
						? "bg-amber-50 font-medium text-neutral-800"
						: "text-neutral-700 hover:bg-neutral-50"
				}`}
			>
				<button
					type="button"
					aria-label={collapsed ? "Expand group" : "Collapse group"}
					onClick={onToggleCollapsed}
					className="w-3 shrink-0 text-[10px] text-neutral-400"
				>
					{collapsed ? "▸" : "▾"}
				</button>
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
						className="flex min-w-0 flex-1 items-baseline justify-between gap-2 text-left"
						onClick={(e) =>
							applyCommand(
								e.shiftKey || e.metaKey || e.ctrlKey
									? commands.toggleObject(group.pieceIds[0])
									: commands.selectObjects(group.pieceIds),
							)
						}
						onDoubleClick={onRename}
						title="Click to select the group, double-click to rename"
					>
						<span className="truncate">{group.name}</span>
						<span className="shrink-0 font-mono text-[10px] font-normal tabular-nums text-neutral-400">
							{group.pieceIds.length}
						</span>
					</button>
				)}
			</li>
			{!collapsed && children}
		</>
	);
}

type RowProps = {
	piece: Piece;
	indent?: boolean;
	selected: boolean;
	renaming: boolean;
	onRename: () => void;
	onRenameDone: () => void;
};

function Row({
	piece,
	indent,
	selected,
	renaming,
	onRename,
	onRenameDone,
}: RowProps) {
	const size = dimensionEntries(piece)
		.map((d) => d.value)
		.join(" × ");

	return (
		<li
			className={`flex h-7.5 items-center gap-2 rounded-md px-2 text-[13px] ${indent ? "pl-6" : ""} ${
				selected
					? "bg-amber-50 font-medium text-neutral-800"
					: "text-neutral-700 hover:bg-neutral-50"
			}`}
		>
			<span
				className={`h-2 w-2 shrink-0 rounded-[2px] ${piece.kind === "sheet" ? "bg-[#dcc196]" : "bg-[#c99a63]"}`}
				title={kindName(piece.kind)}
			/>
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
							e.shiftKey || e.metaKey || e.ctrlKey
								? commands.togglePiece(piece.id)
								: commands.selectPieces([piece.id]),
						)
					}
					onDoubleClick={onRename}
					title="Click to select (Shift/⌘ to add), double-click to rename"
				>
					<span className="truncate">{piece.name}</span>
					<span className="shrink-0 font-mono text-[10px] font-normal tabular-nums text-neutral-400">
						{size}
					</span>
				</button>
			)}
		</li>
	);
}
