import { commands } from "../commands";
import { CONFIG } from "../config";
import type { ScreenPoint } from "../input/pointer";
import { createFraming, createSheet } from "../model/createPiece";
import type { PieceKind } from "../model/types";
import { CREATE_OPTIONS, type Presets } from "../state/creator";
import { useAppStore } from "../state/store";

const store = () => useAppStore.getState();

/** Holding R at least this long, then releasing, creates the highlighted option (weapon-wheel style). */
const HOLD_MS = 250;

/** Opens the wheel at `at` with the last-used kind preselected. */
export function openCreator(at: ScreenPoint) {
	store().setCreator({
		at,
		highlighted: store().lastCreated,
		typed: "",
		openedAt: Date.now(),
	});
}

export function cancelCreator() {
	store().setCreator(null);
}

export function highlight(kind: PieceKind) {
	const c = store().creator;
	if (c && c.highlighted !== kind)
		store().setCreator({ ...c, highlighted: kind, typed: "" });
}

/** Moves the highlight to the next (+1) or previous (−1) option. */
export function cycle(step: 1 | -1) {
	const c = store().creator;
	if (!c) return;
	const i = CREATE_OPTIONS.indexOf(c.highlighted);
	const n = CREATE_OPTIONS.length;
	highlight(CREATE_OPTIONS[(i + step + n) % n]);
}

/** Creates the highlighted option with its preset (updated by anything typed), then closes. */
export function confirmCreate() {
	const { creator, presets, setPresets, setLastCreated, setCreator, apply } =
		store();
	if (!creator) return;
	const kind = creator.highlighted;
	const next = withTyped(presets, kind, creator.typed);
	setPresets(next);
	setLastCreated(kind);
	setCreator(null);
	const { sheet, framing } = CONFIG.defaults;
	apply(
		commands.addPiece(
			kind === "sheet"
				? createSheet({
						length: sheet.length,
						width: sheet.width,
						...next.sheet,
					})
				: createFraming({ length: framing.length, ...next.framing }),
		),
	);
}

/**
 * Presets with a typed size applied to one kind, when it parses.
 * Sheet: one number (thickness). Framing: "45x90" or "45 90" (width × depth); one number sets both.
 */
export function withTyped(
	presets: Presets,
	kind: PieceKind,
	typed: string,
): Presets {
	const numbers = typed
		.split(/[x×*\s]+/i)
		.filter(Boolean)
		.map(Number);
	if (numbers.length === 0 || numbers.some((n) => !(n > 0))) return presets;
	if (kind === "sheet") return { ...presets, sheet: { thickness: numbers[0] } };
	const [width, depth = numbers[0]] = numbers;
	return { ...presets, framing: { width, depth } };
}

/** Letter shortcuts that pick and create in one go (R then S = new sheet). */
const QUICK_PICK: Record<string, PieceKind> = {
	KeyS: "sheet",
	KeyF: "framing",
};

/** Keys while the wheel is open. Returns true when the key was used. */
export function handleCreatorKey(e: KeyboardEvent): boolean {
	const { creator, setCreator } = store();
	if (!creator) return false;
	// Holding R auto-repeats; the wheel is already open.
	if (e.repeat && e.code === "KeyR") return true;

	const optionNumber = Number(e.key);
	const quickPick = QUICK_PICK[e.code];
	if (quickPick) {
		highlight(quickPick);
		confirmCreate();
	} else if (e.key === "Enter" || e.key === " ") confirmCreate();
	else if (e.key === "Escape") cancelCreator();
	else if (
		e.code === "KeyR" ||
		e.key === "ArrowRight" ||
		e.key === "ArrowDown" ||
		e.key === "Tab"
	)
		cycle(1);
	else if (e.key === "ArrowLeft" || e.key === "ArrowUp") cycle(-1);
	else if (
		!creator.typed &&
		optionNumber >= 1 &&
		optionNumber <= CREATE_OPTIONS.length
	)
		highlight(CREATE_OPTIONS[optionNumber - 1]);
	else if (e.key === "Backspace")
		setCreator({ ...creator, typed: creator.typed.slice(0, -1) });
	else if (/^[0-9.xX× ]$/.test(e.key))
		setCreator({ ...creator, typed: creator.typed + e.key });
	else return false;
	return true;
}

/** Releasing R after holding it creates the highlighted option; a quick tap leaves the wheel open. */
export function handleCreatorKeyUp(e: KeyboardEvent) {
	const creator = store().creator;
	if (creator && e.code === "KeyR" && Date.now() - creator.openedAt >= HOLD_MS)
		confirmCreate();
}
