import { useState } from "react";
import { commands } from "../commands";
import { dimensionEntries } from "../model/dimensions";
import { kindName } from "../model/naming";
import type { Id, Piece } from "../model/types";
import { applyCommand, useAppStore } from "../state/store";
import { RenameField } from "./components/RenameField";
import { Panel } from "./Panel";

/** Left-hand list of every piece in the project. Click to select; double-click the name to rename. */
export function Outliner() {
	const pieces = useAppStore((s) => s.doc.pieces);
	const selection = useAppStore((s) => s.doc.selection);
	const [renaming, setRenaming] = useState<Id | null>(null);
	const list = Object.values(pieces);

	return (
		<Panel title={`Objects (${list.length})`} collapsible>
			{list.length === 0 ? (
				<p className="text-xs text-neutral-400">
					Nothing yet. Add a sheet or framing.
				</p>
			) : (
				<ul className="-mx-1 flex max-h-[45vh] flex-col overflow-y-auto">
					{list.map((piece) => (
						<Row
							key={piece.id}
							piece={piece}
							selected={selection.includes(piece.id)}
							renaming={renaming === piece.id}
							onRename={() => setRenaming(piece.id)}
							onRenameDone={() => setRenaming(null)}
						/>
					))}
				</ul>
			)}
		</Panel>
	);
}

type RowProps = {
	piece: Piece;
	selected: boolean;
	renaming: boolean;
	onRename: () => void;
	onRenameDone: () => void;
};

function Row({ piece, selected, renaming, onRename, onRenameDone }: RowProps) {
	const size = dimensionEntries(piece)
		.map((d) => d.value)
		.join(" × ");

	return (
		<li
			className={`flex items-center gap-2 rounded px-1 py-1 text-xs ${
				selected ? "bg-blue-100 text-blue-900" : "hover:bg-neutral-100"
			}`}
		>
			<span
				className={`h-2.5 w-2.5 shrink-0 rounded-sm ${piece.kind === "sheet" ? "bg-[#dcc196]" : "bg-[#c99a63]"}`}
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
					onClick={() => applyCommand(commands.selectPieces([piece.id]))}
					onDoubleClick={onRename}
					title="Click to select, double-click to rename"
				>
					<span className="truncate">{piece.name}</span>
					<span className="shrink-0 text-[10px] tabular-nums text-neutral-400">
						{size}
					</span>
				</button>
			)}
		</li>
	);
}
