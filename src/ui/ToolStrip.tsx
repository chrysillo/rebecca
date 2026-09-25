import { ACTIONS } from "@/input/actions";
import { type Action, shortcutLabel } from "@/input/keymap";
import { type Tool, useAppStore } from "@/state/store";
import { ACTION_ICONS } from "@/ui/icons";

type Item = { action: Action; label: string; tool?: Tool };

/** Groups of buttons, separated by thin rules. */
const GROUPS: Item[][] = [
	[{ action: "newObject", label: "New object" }],
	[
		{ action: "selectTool", label: "Select (hide gizmo)", tool: "select" },
		{ action: "measureTool", label: "Measure", tool: "measure" },
	],
	[
		{ action: "extrude", label: "Extrude face" },
		{ action: "join", label: "Join (cut one piece with another)" },
	],
	[
		{ action: "undo", label: "Undo" },
		{ action: "redo", label: "Redo" },
	],
];

/** Left-hand icon strip. Name and shortcut appear in a tooltip on hover. */
export function ToolStrip() {
	const tool = useAppStore((s) => s.tool);
	const newObjectOpen = useAppStore((s) => s.creator !== null);
	const extruding = useAppStore((s) => s.extrude !== null);
	const joining = useAppStore((s) => s.joiner !== null);
	const enabled: Partial<Record<Action, boolean>> = {
		extrude: useAppStore((s) => s.doc.selectedFaces.length > 0),
		join: useAppStore((s) => s.doc.selection.length > 1),
		undo: useAppStore((s) => s.history.past.length > 0),
		redo: useAppStore((s) => s.history.future.length > 0),
	};
	const isActive = ({ action, tool: itemTool }: Item) =>
		(itemTool !== undefined && itemTool === tool) ||
		(action === "newObject" && newObjectOpen) ||
		(action === "extrude" && extruding) ||
		(action === "join" && joining);

	return (
		<nav className="flex flex-col items-center gap-0.5 rounded-xl border border-black/6 bg-white/92 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_16px_rgba(0,0,0,0.05)] backdrop-blur-md p-1.5">
			{GROUPS.map((group, g) => (
				<div key={group[0].action} className="flex flex-col gap-0.5">
					{g > 0 && <hr className="mx-1.5 my-1 border-neutral-200" />}
					{group.map((item) => (
						<ToolButton
							key={item.action}
							item={item}
							active={isActive(item)}
							disabled={enabled[item.action] === false}
						/>
					))}
				</div>
			))}
		</nav>
	);
}

function ToolButton({
	item,
	active,
	disabled,
}: {
	item: Item;
	active: boolean;
	disabled: boolean;
}) {
	return (
		<div className="group relative">
			<button
				type="button"
				aria-label={`${item.label} (${shortcutLabel(item.action)})`}
				onClick={ACTIONS[item.action]}
				disabled={disabled}
				className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:text-neutral-400 ${
					active
						? "bg-neutral-800 text-amber-300"
						: "text-neutral-600 hover:bg-neutral-100 disabled:hover:bg-transparent"
				}`}
			>
				{ACTION_ICONS[item.action]}
			</button>
			{/* Tooltip: name and shortcut, only on hover. */}
			<span
				role="tooltip"
				className="pointer-events-none absolute top-1/2 left-full z-20 ml-2 -translate-y-1/2 rounded-lg bg-neutral-800/92 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow transition-opacity delay-150 group-hover:opacity-100"
			>
				{item.label}
				<span className="ml-2 text-white/60">{shortcutLabel(item.action)}</span>
			</span>
		</div>
	);
}
