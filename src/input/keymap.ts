/** Every action that can be triggered from the keyboard or the tool strip. */
export type Action =
	| "newObject"
	| "selectTool"
	| "measureTool"
	| "extrude"
	| "join"
	| "viewFront"
	| "viewLeft"
	| "viewRight"
	| "viewTop"
	| "exportCutList"
	| "exportViews"
	| "group"
	| "ungroup"
	| "selectAll"
	| "delete"
	| "undo"
	| "redo"
	| "escape"
	| "newProject"
	| "nextProject"
	| "prevProject"
	| "closeProject"
	| "shortcuts";

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
	selectTool: [
		{ code: "KeyV", mod: false },
		{ code: "KeyM", mod: false },
	],
	// T for tape measure, as in SketchUp.
	measureTool: [{ code: "KeyT", mod: false }],
	extrude: [{ code: "KeyE", mod: false }],
	join: [{ code: "KeyJ", mod: false }],
	// Match the ViewCube's face order: front, left, right, top.
	viewFront: [{ code: "Digit1", mod: false }],
	viewLeft: [{ code: "Digit2", mod: false }],
	viewRight: [{ code: "Digit3", mod: false }],
	viewTop: [{ code: "Digit4", mod: false }],
	group: [{ code: "KeyG", mod: true, shift: false }],
	ungroup: [{ code: "KeyG", mod: true, shift: true }],
	exportViews: [{ code: "KeyP", alt: true, mod: false }],
	exportCutList: [{ code: "KeyL", alt: true, mod: false }],
	selectAll: [{ code: "KeyA", mod: true, shift: false }],
	delete: [{ code: "Delete" }, { code: "Backspace" }],
	undo: [{ code: "KeyZ", mod: true, shift: false }],
	redo: [
		{ code: "KeyZ", mod: true, shift: true },
		{ code: "KeyY", mod: true },
	],
	escape: [{ code: "Escape" }],
	// Alt, because browsers keep ⌘N / ⌘W / Ctrl+Tab for themselves.
	newProject: [{ code: "KeyN", alt: true, mod: false }],
	nextProject: [{ code: "BracketRight", alt: true, mod: false }],
	prevProject: [{ code: "BracketLeft", alt: true, mod: false }],
	closeProject: [{ code: "KeyW", alt: true, mod: false }],
	// "?", as on GitHub and Gmail.
	shortcuts: [{ code: "Slash", shift: true, mod: false }],
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
	BracketLeft: "[",
	BracketRight: "]",
	Slash: "/",
};

/** Keys whose shifted character is what people call them, shown instead of "⇧" + the key. */
const SHIFTED_NAMES: Record<string, string> = { Slash: "?" };

/** How a modifier is written on this platform: symbols on macOS, words elsewhere. */
export const MODIFIER_NAMES = isMac
	? { shift: "⇧", alt: "⌥", mod: "⌘" }
	: { shift: "Shift", alt: "Alt", mod: "Ctrl" };

/** Human-readable key combination, e.g. "V", "⌘Z", "⇧⌘Z" (or "Shift+Ctrl+Z" off macOS). */
export function bindingLabel(b: KeyBinding): string {
	const shifted = b.shift ? SHIFTED_NAMES[b.code] : undefined;
	const key = shifted ?? KEY_NAMES[b.code] ?? b.code.replace(/^Key|^Digit/, "");
	const joiner = isMac ? "" : "+";
	const parts = [
		b.shift && !shifted ? MODIFIER_NAMES.shift : "",
		b.alt ? MODIFIER_NAMES.alt : "",
		b.mod ? MODIFIER_NAMES.mod : "",
	].filter(Boolean);
	return [...parts, key].join(joiner);
}

/** The shortcut shown for an action in tooltips and menus: its first binding. */
export const shortcutLabel = (action: Action): string =>
	bindingLabel(KEYMAP[action][0]);
