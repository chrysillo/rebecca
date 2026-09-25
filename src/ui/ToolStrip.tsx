import type { Action } from "@/input/keymap";
import { type Tool, useAppStore } from "@/state/store";
import { IconButton } from "@/ui/IconButton";

type Item = { action: Action; label: string; tool?: Tool };

/** Groups of buttons, separated by thin rules. Only actions that operate on the model belong
 * here — exports live in ExportBar instead, next to the view cube they sit below. */
const GROUPS: Item[][] = [
	[{ action: "newObject", label: "New object" }],
	[
		{ action: "selectTool", label: "Select", tool: "select" },
		{ action: "measureTool", label: "Measure", tool: "measure" },
	],
	[
		{ action: "extrude", label: "Extrude face" },
		{ action: "join", label: "Join (cut one piece with another)" },
		{ action: "group", label: "Group / ungroup" },
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
		group: useAppStore((s) => s.doc.selection.length > 1),
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
						<IconButton
							key={item.action}
							action={item.action}
							label={item.label}
							active={isActive(item)}
							disabled={enabled[item.action] === false}
						/>
					))}
				</div>
			))}
		</nav>
	);
}
