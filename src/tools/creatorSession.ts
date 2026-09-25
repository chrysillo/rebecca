import { commands } from "@/commands";
import type { ScreenPoint } from "@/input/pointer";
import { newId } from "@/model/createPiece";
import {
	findStock,
	orderedStock,
	type Stock,
	type StockSize,
	stockOfKind,
} from "@/model/stock";
import type { Id, PieceKind } from "@/model/types";
import { useAppStore } from "@/state/store";

const store = () => useAppStore.getState();
const options = () => orderedStock(store().doc.stock);

/** Holding R at least this long, then releasing, creates the highlighted option (weapon-wheel style). */
const HOLD_MS = 250;

/** Opens the wheel at `at` with the last-used stock preselected. */
export function openCreator(at: ScreenPoint) {
	const all = options();
	if (all.length === 0) {
		store().showNotice("Add a size in the Stock panel first.");
		return;
	}
	const last = store().lastCreated;
	const highlighted = all.some((s) => s.id === last) && last ? last : all[0].id;
	store().setCreator({
		at,
		highlighted,
		typed: "",
		openedAt: performance.now(),
	});
}

export function cancelCreator() {
	store().setCreator(null);
}

export function highlight(stockId: Id) {
	const c = store().creator;
	if (c && c.highlighted !== stockId)
		store().setCreator({ ...c, highlighted: stockId, typed: "" });
}

/** Moves the highlight to the next (+1) or previous (−1) option. */
export function cycle(step: 1 | -1) {
	const c = store().creator;
	if (!c) return;
	const all = options();
	const i = all.findIndex((s) => s.id === c.highlighted);
	highlight(all[(i + step + all.length) % all.length].id);
}

/**
 * The stock a confirm would use: the highlighted entry, or — when a different size was typed —
 * the matching existing entry of that kind, or a brand-new one.
 */
export function resolveStock(): Stock | null {
	const { creator, doc } = store();
	const highlighted = creator ? doc.stock[creator.highlighted] : undefined;
	if (!creator || !highlighted) return null;
	const size = typedSize(highlighted.kind, creator.typed);
	if (!size) return highlighted;
	return (
		findStock(doc.stock, highlighted.kind, size) ??
		({ id: newId(), kind: highlighted.kind, ...size } as Stock)
	);
}

/** Creates a piece from the highlighted (or typed) stock, then closes. One undo step. */
export function confirmCreate() {
	const stock = resolveStock();
	store().setCreator(null);
	if (!stock) return;
	store().setLastCreated(stock.id);
	store().apply(commands.addPieceFromStock(stock));
}

/** Sheet: one number (thickness). Framing: "45x90" or "45 90" (width × depth); one number sets both. */
export function typedSize(kind: PieceKind, typed: string): StockSize | null {
	const numbers = typed
		.split(/[x×*\s]+/i)
		.filter(Boolean)
		.map(Number);
	if (numbers.length === 0 || numbers.some((n) => !(n > 0))) return null;
	if (kind === "sheet") return { thickness: numbers[0] };
	const [width, depth = numbers[0]] = numbers;
	return { width, depth };
}

/** Letter shortcuts that pick and create in one go (R then S = new sheet). */
const QUICK_PICK: Record<string, PieceKind> = {
	KeyS: "sheet",
	KeyF: "framing",
};

/** S / F: the highlighted entry if it's that kind, else the first entry of that kind. */
function quickPick(kind: PieceKind) {
	const c = store().creator;
	const current = c ? store().doc.stock[c.highlighted] : undefined;
	const target =
		current?.kind === kind ? current : stockOfKind(store().doc.stock, kind)[0];
	if (!target) return;
	highlight(target.id);
	confirmCreate();
}

/** Keys while the wheel is open. Returns true when the key was used. */
export function handleCreatorKey(e: KeyboardEvent): boolean {
	const { creator, setCreator } = store();
	if (!creator) return false;
	// Holding R auto-repeats; the wheel is already open.
	if (e.repeat && e.code === "KeyR") return true;

	const all = options();
	const optionNumber = Number(e.key);
	if (QUICK_PICK[e.code]) quickPick(QUICK_PICK[e.code]);
	else if (e.key === "Enter" || e.key === " ") confirmCreate();
	else if (e.key === "Escape") cancelCreator();
	else if (
		e.code === "KeyR" ||
		e.key === "ArrowRight" ||
		e.key === "ArrowDown" ||
		e.key === "Tab"
	)
		cycle(1);
	else if (e.key === "ArrowLeft" || e.key === "ArrowUp") cycle(-1);
	else if (!creator.typed && optionNumber >= 1 && optionNumber <= all.length)
		highlight(all[optionNumber - 1].id);
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
	// Use the key-up's own timestamp (when the key was actually released), not "now": if rendering
	// the wheel delayed this handler, a quick tap must not be mistaken for a hold.
	if (creator && e.code === "KeyR" && e.timeStamp - creator.openedAt >= HOLD_MS)
		confirmCreate();
}
