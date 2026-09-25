import type { FaceRef } from "../geometry/box";
import type { Id, Piece } from "../model/types";

/**
 * Everything that is saved and undoable.
 * Selection lives here so that selecting counts as an undo step.
 */
export type DocumentState = {
	pieces: Record<Id, Piece>;
	/** Ordered list of selected ids; an array so multi-select is a small step later. */
	selection: Id[];
	/**
	 * A single selected face (e.g. for push/pull later). Selecting a face clears the piece
	 * selection and vice versa, so at most one of the two is ever non-empty.
	 */
	selectedFace: FaceRef | null;
};

export const emptyDocument: DocumentState = {
	pieces: {},
	selection: [],
	selectedFace: null,
};

/** A document change: a pure function returning a new document, or the same one when nothing changed. */
export type Command = (doc: DocumentState) => DocumentState;
