import type { ReactNode } from "react";
import type { Action } from "@/input/keymap";

/** 20px line icons for the tool strip, drawn inline (no icon library). */
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

/** Icons for the actions that have a tool-strip button (others are keyboard-only). */
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
	undo: (
		<Icon>
			<path d="M9 14 L4 9 L9 4" />
			<path d="M4 9 H14 A6 6 0 0 1 14 21 H10" />
		</Icon>
	),
	redo: (
		<Icon>
			<path d="M15 14 L20 9 L15 4" />
			<path d="M20 9 H10 A6 6 0 0 0 10 21 H14" />
		</Icon>
	),
};
