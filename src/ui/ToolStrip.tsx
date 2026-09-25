import { ACTIONS } from "../input/actions";
import { type Action, shortcutLabel } from "../input/keymap";
import { type Tool, useAppStore } from "../state/store";

type Item = { action: Action; label: string; tool?: Tool };

const CREATE: Item[] = [{ action: "newObject", label: "New object" }];

const TOOLS: Item[] = [
	{ action: "selectTool", label: "Select", tool: "select" },
	{ action: "moveTool", label: "Move / Rotate", tool: "move" },
];

const FACE: Item[] = [{ action: "extrude", label: "Extrude face" }];

const EDITS: Item[] = [
	{ action: "delete", label: "Delete" },
	{ action: "undo", label: "Undo" },
	{ action: "redo", label: "Redo" },
];

/** Left-hand strip of actions, each labelled with its keyboard shortcut. */
export function ToolStrip() {
	const tool = useAppStore((s) => s.tool);
	const newObjectOpen = useAppStore((s) => s.creator !== null);
	const extruding = useAppStore((s) => s.extrude !== null);
	const enabled: Partial<Record<Action, boolean>> = {
		delete: useAppStore((s) => s.doc.selection.length > 0),
		extrude: useAppStore((s) => s.doc.selectedFace !== null),
		undo: useAppStore((s) => s.history.past.length > 0),
		redo: useAppStore((s) => s.history.future.length > 0),
	};

	const button = ({ action, label, tool: itemTool }: Item) => (
		<button
			key={action}
			type="button"
			onClick={ACTIONS[action]}
			disabled={enabled[action] === false}
			className={`flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-xs disabled:opacity-40 ${
				(itemTool && itemTool === tool) ||
				(action === "newObject" && newObjectOpen) ||
				(action === "extrude" && extruding)
					? "bg-amber-100 font-semibold text-amber-900"
					: "hover:bg-neutral-100 disabled:hover:bg-transparent"
			}`}
		>
			{label}
			<span className="text-neutral-400">({shortcutLabel(action)})</span>
		</button>
	);

	return (
		<nav className="flex w-60 flex-col gap-1 rounded-lg border border-neutral-200 bg-white/95 p-1.5 shadow-sm backdrop-blur">
			{CREATE.map(button)}
			<hr className="my-1 border-neutral-200" />
			{TOOLS.map(button)}
			<hr className="my-1 border-neutral-200" />
			{FACE.map(button)}
			<hr className="my-1 border-neutral-200" />
			{EDITS.map(button)}
		</nav>
	);
}
