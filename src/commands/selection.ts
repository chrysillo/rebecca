import { type FaceRef, sameFace } from "../geometry/box";
import type { Id } from "../model/types";
import type { Command } from "../state/document";

const sameIds = (a: Id[], b: Id[]) =>
	a.length === b.length && a.every((id, i) => id === b[i]);

/** Selects whole pieces (clearing any face selection). */
export const selectPieces =
	(ids: Id[]): Command =>
	(doc) => {
		const valid = ids.filter((id) => doc.pieces[id]);
		if (sameIds(valid, doc.selection) && !doc.selectedFace) return doc;
		return { ...doc, selection: valid, selectedFace: null };
	};

/** Selects one face of a piece (clearing any piece selection). */
export const selectFace =
	(face: FaceRef): Command =>
	(doc) => {
		if (!doc.pieces[face.pieceId]) return doc;
		if (sameFace(face, doc.selectedFace) && doc.selection.length === 0)
			return doc;
		return { ...doc, selection: [], selectedFace: face };
	};

export const clearSelection: Command = selectPieces([]);
