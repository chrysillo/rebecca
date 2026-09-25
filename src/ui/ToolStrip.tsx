import { ACTIONS } from "@/input/actions";
import { type Action, shortcutLabel } from "@/input/keymap";
import { type Tool, useAppStore } from "@/state/store";
import { ACTION_ICONS } from "@/ui/icons";

type Item = { action: Action; label: string; tool?: Tool };

/** Groups of buttons, separated by thin rules. */
const GROUPS: Item[][] = [
	[{ action: "newObject", label: "New object" }],
	[{ action: "selectTool", label: "Select (hide gizmo)", tool: "select" }],
	[{ action: "extrude", label: "Extrude face" }],
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
	const enabled: Partial<Record<Action, boolean>> = {
		extrude: useAppStore((s) => s.doc.selectedFaces.length > 0),
		undo: useAppStore((s) => s.history.past.length > 0),
		redo: useAppStore((s) => s.history.future.length > 0),
	};
	const isActive = ({ action, tool: itemTool }: Item) =>
		(itemTool !== undefined && itemTool === tool) ||
		(action === "newObject" && newObjectOpen) ||
		(action === "extrude" && extruding);

	return (
		<nav className="flex w-11 flex-col items-center gap-1 rounded-lg border border-neutral-200 bg-white/95 p-1 shadow-sm backdrop-blur">
			{GROUPS.map((group, g) => (
				<div key={group[0].action} className="flex flex-col gap-1">
					{g > 0 && <hr className="mb-1 border-neutral-200" />}
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
				className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors disabled:opacity-35 ${
					active
						? "bg-amber-100 text-amber-900"
						: "text-neutral-700 hover:bg-neutral-100 disabled:hover:bg-transparent"
				}`}
			>
				{ACTION_ICONS[item.action]}
			</button>
			{/* Tooltip: name and shortcut, only on hover. */}
			<span
				role="tooltip"
				className="pointer-events-none absolute top-1/2 left-full z-20 ml-2 -translate-y-1/2 rounded-md bg-neutral-900/90 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow transition-opacity delay-150 group-hover:opacity-100"
			>
				{item.label}
				<span className="ml-2 text-white/60">{shortcutLabel(item.action)}</span>
			</span>
		</div>
	);
}
