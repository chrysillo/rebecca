/** Modifier keys that change how tools behave. Configurable here, never hard-coded in tools. */
export type ToolModifier = "duplicate" | "fine";

export type ModifierKey = "shift" | "alt" | "ctrl" | "meta";

export const TOOL_MODIFIERS: Record<ToolModifier, ModifierKey> = {
	/** Move gizmo: drag a copy, leaving the original in place. */
	duplicate: "alt",
	/** Move: exact 1 mm steps, no snapping. Rotate: small angle step. */
	fine: "shift",
};

type ModifierState = {
	shiftKey: boolean;
	altKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
};

const FLAG: Record<ModifierKey, keyof ModifierState> = {
	shift: "shiftKey",
	alt: "altKey",
	ctrl: "ctrlKey",
	meta: "metaKey",
};

/** Works with any keyboard or pointer event. */
export const isHeld = (modifier: ToolModifier, event: ModifierState): boolean =>
	event[FLAG[TOOL_MODIFIERS[modifier]]];
