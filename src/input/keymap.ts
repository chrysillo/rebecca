/** Every action that can be triggered from the keyboard or the tool strip. */
export type Action =
	| "newObject"
	| "selectTool"
	| "moveTool"
	| "extrude"
	| "delete"
	| "undo"
	| "redo"
	| "escape";

/**
 * A key, matched by physical position (`KeyboardEvent.code`) so Alt/Option doesn't change it.
 * A modifier left undefined means "either". `mod` is Cmd on macOS and Ctrl elsewhere.
 */
export type KeyBinding = {
	code: string;
	mod?: boolean;
	shift?: boolean;
	alt?: boolean;
};

/** The first binding of each action is the one shown in the UI. */
export const KEYMAP: Record<Action, KeyBinding[]> = {
	newObject: [{ code: "KeyR", mod: false }],
	selectTool: [{ code: "KeyV", mod: false }],
	moveTool: [{ code: "KeyM", mod: false }],
	extrude: [{ code: "KeyE", mod: false }],
	delete: [{ code: "Delete" }, { code: "Backspace" }],
	undo: [{ code: "KeyZ", mod: true, shift: false }],
	redo: [
		{ code: "KeyZ", mod: true, shift: true },
		{ code: "KeyY", mod: true },
	],
	escape: [{ code: "Escape" }],
};

const isMac =
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad/.test(navigator.platform);

export function matches(binding: KeyBinding, e: KeyboardEvent): boolean {
	const mod = isMac ? e.metaKey : e.ctrlKey;
	return (
		binding.code === e.code &&
		(binding.mod === undefined || binding.mod === mod) &&
		(binding.shift === undefined || binding.shift === e.shiftKey) &&
		(binding.alt === undefined || binding.alt === e.altKey)
	);
}

export function actionFor(e: KeyboardEvent): Action | null {
	for (const [action, bindings] of Object.entries(KEYMAP) as [
		Action,
		KeyBinding[],
	][]) {
		if (bindings.some((b) => matches(b, e))) return action;
	}
	return null;
}

const KEY_NAMES: Record<string, string> = {
	Delete: "Del",
	Backspace: "⌫",
	Escape: "Esc",
};

/** Human-readable shortcut for an action, e.g. "V", "⌘Z", "⇧⌘Z" (or "Ctrl+Z" off macOS). */
export function shortcutLabel(action: Action): string {
	const b = KEYMAP[action][0];
	const key = KEY_NAMES[b.code] ?? b.code.replace(/^Key|^Digit/, "");
	const parts = [
		b.shift ? (isMac ? "⇧" : "Shift+") : "",
		b.alt ? (isMac ? "⌥" : "Alt+") : "",
		b.mod ? (isMac ? "⌘" : "Ctrl+") : "",
	];
	return parts.join("") + key;
}
