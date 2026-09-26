import { type Action, MODIFIER_NAMES as M } from "@/input/keymap";

/**
 * One line of the shortcuts list: an action (its keys come from the keymap, so they can't go
 * stale), or a modifier, in-context key or non-obvious gesture written out by hand. Each entry in
 * `keys` is an alternative; an array is a combination, drawn as keys side by side.
 */
export type ShortcutRow =
	| { does: string; action: Action }
	| { does: string; keys: (string | string[])[] };

export type ShortcutSection = { title: string; rows: ShortcutRow[] };

/**
 * Everything the list shows, in reading order. Plain clicks and drags that anyone would try aren't
 * here, and nor are wheel keys: each wheel shows its own.
 */
export const SHORTCUT_SECTIONS: ShortcutSection[] = [
	{
		title: "Select",
		rows: [
			{ does: "Add or remove a piece or face", keys: [[M.shift, "Click"]] },
			{ does: "One piece inside a group", keys: [[M.alt, "Click"]] },
			{ does: "Select all", action: "selectAll" },
			{ does: "Deselect / cancel", action: "escape" },
		],
	},
	{
		title: "Tools",
		rows: [
			{ does: "New piece (hold, release to create)", action: "newObject" },
			{ does: "Select tool", action: "selectTool" },
			{ does: "Measure: click two edges", action: "measureTool" },
			{ does: "Extrude: type mm, Enter", action: "extrude" },
			{ does: "While extruding a piece: next face", keys: ["Tab"] },
			{ does: "Join: cut one piece with another", action: "join" },
		],
	},
	{
		title: "Move and rotate",
		rows: [
			{ does: "Fine steps (1 mm / 5°)", keys: [[M.shift, "Drag"]] },
			{ does: "Duplicate while moving", keys: [[M.alt, "Drag"]] },
		],
	},
	{
		title: "Edit",
		rows: [
			{ does: "Group", action: "group" },
			{ does: "Ungroup", action: "ungroup" },
			{ does: "Delete", action: "delete" },
			{ does: "Undo", action: "undo" },
			{ does: "Redo", action: "redo" },
		],
	},
	{
		title: "View",
		rows: [
			{ does: "Orbit", keys: ["Right-drag"] },
			{ does: "Pan", keys: ["Middle-drag", [M.shift, "Right-drag"]] },
			{ does: "Front", action: "viewFront" },
			{ does: "Left", action: "viewLeft" },
			{ does: "Right", action: "viewRight" },
			{ does: "Top", action: "viewTop" },
		],
	},
	{
		title: "Projects and export",
		rows: [
			{ does: "New project", action: "newProject" },
			{ does: "Next tab", action: "nextProject" },
			{ does: "Previous tab", action: "prevProject" },
			{ does: "Close tab", action: "closeProject" },
			{ does: "Copy cut list", action: "exportCutList" },
			{ does: "Export views (PNG)", action: "exportViews" },
			{ does: "Show this list", action: "shortcuts" },
		],
	},
];
