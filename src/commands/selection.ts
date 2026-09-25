import { type FaceRef, sameFace } from "@/geometry/box";
import type { Id, Pivot } from "@/model/types";
import type { Command } from "@/state/document";

const sameIds = (a: Id[], b: Id[]) =>
	a.length === b.length && a.every((id, i) => id === b[i]);

const sameFaces = (a: FaceRef[], b: FaceRef[]) =>
	a.length === b.length && a.every((f, i) => sameFace(f, b[i]));

/** Selects whole pieces (clearing any face selection). */
export const selectPieces =
	(ids: Id[]): Command =>
	(doc) => {
		const valid = ids.filter((id) => doc.pieces[id]);
		if (sameIds(valid, doc.selection) && doc.selectedFaces.length === 0)
			return doc;
		return {
			...doc,
			selection: valid,
			selectedFaces: [],
			groupPivot: "centre",
		};
	};

/** Shift+click on a piece: adds it to the piece selection, or removes it if already selected. */
export const togglePiece =
	(id: Id): Command =>
	(doc) =>
		selectPieces(
			doc.selection.includes(id)
				? doc.selection.filter((s) => s !== id)
				: [...doc.selection, id],
		)(doc);

/** Chooses the pivot several selected pieces rotate around together. */
export const setGroupPivot =
	(pivot: Pivot): Command =>
	(doc) =>
		doc.groupPivot === pivot ? doc : { ...doc, groupPivot: pivot };

/** Selects exactly these faces (clearing any piece selection). */
export const selectFaces =
	(faces: FaceRef[]): Command =>
	(doc) => {
		const valid = faces.filter((f) => doc.pieces[f.pieceId]);
		if (sameFaces(valid, doc.selectedFaces) && doc.selection.length === 0)
			return doc;
		return { ...doc, selection: [], selectedFaces: valid };
	};

/** Shift+click: adds a face to the face selection, or removes it if already selected. */
export const toggleFace =
	(face: FaceRef): Command =>
	(doc) => {
		const without = doc.selectedFaces.filter((f) => !sameFace(f, face));
		const next =
			without.length < doc.selectedFaces.length ? without : [...without, face];
		return selectFaces(next)(doc);
	};

export const clearSelection: Command = selectPieces([]);
