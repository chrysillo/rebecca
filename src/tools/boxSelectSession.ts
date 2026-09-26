import { commands } from "@/commands";
import { pieceCorners } from "@/geometry/box";
import type { ScreenPoint } from "@/input/pointer";
import { toScreen } from "@/input/screen";
import type { BoxSelectState } from "@/state/boxSelect";
import { useAppStore } from "@/state/store";
import { piecesInBox } from "@/tools/boxSelectTool";

const store = () => useAppStore.getState();

/**
 * Starts a selection box at `start` (window pixels), if nothing else is going on. Shift adds to
 * the selection; Alt picks pieces inside groups on their own. Returns whether it started.
 */
export function startBoxSelect(
	start: ScreenPoint,
	modifiers: { shiftKey: boolean; altKey: boolean },
): boolean {
	const s = store();
	if (
		s.tool !== "select" ||
		s.drag ||
		s.extrude ||
		s.creator ||
		s.joiner ||
		s.contextMenu
	)
		return false;
	s.setBoxSelect({
		start,
		end: start,
		additive: modifiers.shiftKey,
		single: modifiers.altKey,
		hits: [],
	});
	return true;
}

/** Moves the box's far corner to the pointer and lights up what it would select. */
export function updateBoxSelect(end: ScreenPoint) {
	const { boxSelect, setBoxSelect } = store();
	if (!boxSelect) return;
	const next = { ...boxSelect, end };
	setBoxSelect({ ...next, hits: boxHits(next) });
}

/** Releasing: selects what the box picked (added to the selection with Shift) as one undo step. */
export function finishBoxSelect() {
	const { boxSelect, doc, setBoxSelect, apply } = store();
	if (!boxSelect) return;
	setBoxSelect(null);
	const hits = boxHits(boxSelect);
	apply(
		commands.selectPieces(
			boxSelect.additive
				? [
						...doc.selection,
						...hits.filter((id) => !doc.selection.includes(id)),
					]
				: hits,
		),
	);
}

/** Escape: drops the box, leaving the selection as it was. Returns whether there was one. */
export function cancelBoxSelect(): boolean {
	if (!store().boxSelect) return false;
	store().setBoxSelect(null);
	return true;
}

function boxHits({ start, end, single }: BoxSelectState) {
	const { doc } = store();
	const boxes = Object.values(doc.pieces).map((piece) => ({
		id: piece.id,
		corners: pieceCorners(piece).map(toScreen),
	}));
	return piecesInBox(boxes, doc.groups, start, end, single);
}
