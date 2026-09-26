import type { ReactNode } from "react";
import type { Action } from "@/input/keymap";

/** 20px line icons for the tool strip and export bar, drawn inline (no icon library). */
function Icon({ children }: { children: ReactNode }) {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.75}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			{children}
		</svg>
	);
}

/** Icons for the actions that have a button (the tool strip, export bar and shortcuts button); others are keyboard-only. */
export const ACTION_ICONS: Partial<Record<Action, ReactNode>> = {
	// A box with a plus: add a piece.
	newObject: (
		<Icon>
			<path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z" />
			<path d="M12 9 V15 M9 12 H15" />
		</Icon>
	),
	// Pointer arrow.
	selectTool: (
		<Icon>
			<path d="M5 3 L19 12 L12.5 13.5 L9.5 20 Z" />
		</Icon>
	),
	// A ruler.
	measureTool: (
		<Icon>
			<path d="M3 16 L16 3 L21 8 L8 21 Z" />
			<path d="M7 12 L9 14 M10 9 L12 11 M13 6 L15 8" />
		</Icon>
	),
	// A block with an arrow pulling its top face up.
	extrude: (
		<Icon>
			<path d="M4 14 H20 V20 H4 Z" />
			<path d="M12 11 V3 M9 6 L12 3 L15 6" />
		</Icon>
	),
	// Two boards, one notched to take the other: a housing joint.
	join: (
		<Icon>
			<path d="M3 13 H9 V9 H15 V13 H21 V19 H3 Z" />
			<path d="M9 3 H15 V13" />
			<path d="M9 3 V9" />
		</Icon>
	),
	// Two boxes inside a dashed frame.
	group: (
		<Icon>
			<path d="M3 3 H6 M9 3 H12 M15 3 H18 M21 3 V6 M21 9 V12 M21 15 V18 M21 21 H18 M15 21 H12 M9 21 H6 M3 21 V18 M3 15 V12 M3 9 V6" />
			<path d="M7 7 H12 V12 H7 Z M12 12 H17 V17 H12 Z" />
		</Icon>
	),
	// A clipboard with list lines: copy the cut list.
	exportCutList: (
		<Icon>
			<path d="M8 4 H16 V6 H8 Z" />
			<path d="M6 5 H18 V21 H6 Z" />
			<path d="M9 10 H15 M9 13 H15 M9 16 H13" />
		</Icon>
	),
	// A picture frame with a mountain: image export.
	exportViews: (
		<Icon>
			<path d="M3 5 H21 V19 H3 Z" />
			<path d="M3 16 L9 10 L14 15 L17 12 L21 16" />
		</Icon>
	),
	// A keyboard: the list of shortcuts.
	shortcuts: (
		<Icon>
			<path d="M3 6 H21 V18 H3 Z" />
			<path d="M7 10 H7.01 M11 10 H11.01 M15 10 H15.01 M7 14 H7.01 M17 10 H17.01 M17 14 H17.01 M10 14 H14" />
		</Icon>
	),
};
