import { type FaceRef, piecesAabb } from "@/geometry/box";
import { extrudeAll } from "@/geometry/extrude";
import { clampToFloor } from "@/geometry/floor";
import { resizePiece } from "@/geometry/resize";
import { roundVec, type Vec3 } from "@/geometry/vec";
import { newId } from "@/model/createPiece";
import {
	type EditableDimension,
	isEditableDimension,
	pieceSize,
} from "@/model/dimensions";
import { defaultName } from "@/model/naming";
import type { Id, Piece, Pivot, Transform } from "@/model/types";
import type { Command, DocumentState } from "@/state/document";

const PLACEMENT_GAP = 100;

/** Adds a piece beside everything already in the scene, resting on the floor, and selects it. */
export const addPiece =
	(piece: Piece): Command =>
	(doc) => {
		const placed = {
			...piece,
			name: piece.name || defaultName(Object.values(doc.pieces), piece.kind),
			position: placementFor(doc, piece),
		};
		return {
			...doc,
			pieces: { ...doc.pieces, [placed.id]: clampToFloor(placed) },
			selection: [placed.id],
			selectedFaces: [],
		};
	};

function placementFor(doc: DocumentState, piece: Piece): Vec3 {
	const size = pieceSize(piece);
	const existing = Object.values(doc.pieces);
	const startX =
		existing.length === 0 ? 0 : piecesAabb(existing).max.x + PLACEMENT_GAP;
	return { x: startX + size.x / 2, y: size.y / 2, z: size.z / 2 };
}

export const deletePieces =
	(ids: Id[]): Command =>
	(doc) => {
		const pieces = { ...doc.pieces };
		let changed = false;
		for (const id of ids) {
			if (!pieces[id]) continue;
			delete pieces[id];
			changed = true;
		}
		if (!changed) return doc;
		return {
			...doc,
			pieces,
			selection: doc.selection.filter((id) => pieces[id]),
			selectedFaces: doc.selectedFaces.filter((f) => pieces[f.pieceId]),
			// A measurement can't outlive either piece it measures.
			measurements: Object.fromEntries(
				Object.entries(doc.measurements).filter(
					([, m]) => pieces[m.from.pieceId] && pieces[m.to.pieceId],
				),
			),
		};
	};

/** Copies pieces to new transforms (originals untouched) and selects the copies. */
export const duplicatePiecesTo =
	(transforms: Record<Id, Transform>): Command =>
	(doc) => {
		const pieces = { ...doc.pieces };
		const selection: Id[] = [];
		for (const [id, { position, rotation }] of Object.entries(transforms)) {
			const original = doc.pieces[id];
			if (!original) continue;
			const copy = clampToFloor({
				...original,
				id: newId(),
				position: roundVec(position),
				rotation,
			});
			pieces[copy.id] = copy;
			selection.push(copy.id);
		}
		return selection.length
			? { ...doc, pieces, selection, selectedFaces: [] }
			: doc;
	};

/**
 * Changes one editable dimension. Fixed dimensions (thickness, section) are refused.
 * The piece grows or shrinks from its local negative end, so that end stays where it is.
 */
export const setDimension =
	(id: Id, key: EditableDimension, value: number): Command =>
	(doc) => {
		const piece = doc.pieces[id];
		if (!piece || !isEditableDimension(piece.kind, key)) return doc;
		if (!(value > 0) || piece[key] === value) return doc;
		return replacePiece(doc, resizePiece(piece, { [key]: value }));
	};

export function replacePiece(doc: DocumentState, piece: Piece): DocumentState {
	return { ...doc, pieces: { ...doc.pieces, [piece.id]: piece } };
}

/** Renames a piece. Blank names are ignored. */
export const renamePiece =
	(id: Id, name: string): Command =>
	(doc) => {
		const piece = doc.pieces[id];
		const trimmed = name.trim();
		if (!piece || !trimmed || trimmed === piece.name) return doc;
		return replacePiece(doc, { ...piece, name: trimmed });
	};

/**
 * Pushes/pulls faces together by the same `distance` mm, each along its own normal.
 * Refused (no change) if any face's dimension is fixed.
 */
export const extrudeFaces =
	(faces: FaceRef[], distance: number): Command =>
	(doc) => {
		if (distance === 0) return doc;
		const changed = extrudeAll(doc.pieces, faces, distance);
		return changed ? { ...doc, pieces: { ...doc.pieces, ...changed } } : doc;
	};

/** Chooses which pivot a piece rotates around. */
export const setPivot =
	(id: Id, pivot: Pivot): Command =>
	(doc) => {
		const piece = doc.pieces[id];
		if (!piece || piece.pivot === pivot) return doc;
		return replacePiece(doc, { ...piece, pivot });
	};
