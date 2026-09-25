import type { FaceRef } from "@/geometry/box";
import { newId } from "@/model/createPiece";
import type { Measurement } from "@/model/measurement";
import type { Stock } from "@/model/stock";
import type { Id, Piece, Pivot } from "@/model/types";

/**
 * Everything that is saved and undoable.
 * Selection lives here so that selecting counts as an undo step.
 */
export type DocumentState = {
	pieces: Record<Id, Piece>;
	/** The project's sheet thicknesses and framing sections. */
	stock: Record<Id, Stock>;
	/** Saved dimension lines between faces. */
	measurements: Record<Id, Measurement>;
	/** Selected pieces, in the order they were added. */
	selection: Id[];
	/** Pivot used when several pieces are selected (a single piece uses its own). Resets when the selection changes. */
	groupPivot: Pivot;
	/**
	 * Selected faces, in the order they were clicked (the last one drives an extrude).
	 * Selecting faces clears the piece selection and vice versa, so at most one of the two is non-empty.
	 */
	selectedFaces: FaceRef[];
};

/** A new project starts with one common size of each kind. */
function starterStock(): Record<Id, Stock> {
	const sheet: Stock = { id: newId(), kind: "sheet", thickness: 18 };
	const framing: Stock = { id: newId(), kind: "framing", width: 38, depth: 63 };
	return { [sheet.id]: sheet, [framing.id]: framing };
}

export const emptyDocument: DocumentState = {
	pieces: {},
	stock: starterStock(),
	measurements: {},
	selection: [],
	groupPivot: "centre",
	selectedFaces: [],
};

/** A document change: a pure function returning a new document, or the same one when nothing changed. */
export type Command = (doc: DocumentState) => DocumentState;
