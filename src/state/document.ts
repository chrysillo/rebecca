import type { Id, Piece } from "../model/types";

/**
 * Everything that is saved and undoable.
 * Selection lives here so that selecting counts as an undo step.
 */
export type DocumentState = {
	pieces: Record<Id, Piece>;
	/** Ordered list of selected ids; an array so multi-select is a small step later. */
	selection: Id[];
};

export const emptyDocument: DocumentState = { pieces: {}, selection: [] };

/** A document change: a pure function returning a new document, or the same one when nothing changed. */
export type Command = (doc: DocumentState) => DocumentState;
