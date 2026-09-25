import { piecesAabb, rotateVector } from "../geometry/box";
import { clampToFloor } from "../geometry/floor";
import { add, roundVec, scale, sub, type Vec3 } from "../geometry/vec";
import { newId } from "../model/createPiece";
import {
	type EditableDimension,
	isEditableDimension,
	pieceSize,
} from "../model/dimensions";
import { defaultName } from "../model/naming";
import type { Id, Piece, Transform } from "../model/types";
import type { Command, DocumentState } from "../state/document";

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
			pieces: { ...doc.pieces, [placed.id]: clampToFloor(placed) },
			selection: [placed.id],
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
			pieces,
			selection: doc.selection.filter((id) => pieces[id]),
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
		return selection.length ? { pieces, selection } : doc;
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
		const resized = { ...piece, [key]: value };
		const growth = sub(pieceSize(resized), pieceSize(piece));
		const shift = rotateVector(scale(growth, 0.5), piece.rotation);
		const position = roundVec(add(piece.position, shift));
		return replacePiece(doc, clampToFloor({ ...resized, position }));
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
