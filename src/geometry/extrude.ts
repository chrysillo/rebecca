import { type FaceRef, faceNormal } from "@/geometry/box";
import { clampToFloor, lowestZ } from "@/geometry/floor";
import { add, roundMm, roundVec, scale } from "@/geometry/vec";
import {
	dimensionAlong,
	type EditableDimension,
	isEditableDimension,
} from "@/model/dimensions";
import type { Id, Piece } from "@/model/types";

/** Extruding can shrink a piece, but never below this. */
const MIN_DIMENSION = 1;

/** The dimension a face extrudes, or null when that dimension is fixed (e.g. sheet thickness). */
export function extrudableDimension(
	piece: Piece,
	face: FaceRef,
): EditableDimension | null {
	const key = dimensionAlong(piece.kind, face.axis);
	return isEditableDimension(piece.kind, key) ? key : null;
}

/**
 * The piece with one face pushed (+) or pulled (−) along its normal by `distance` mm.
 * The opposite face stays put. Returns null if that face's dimension is fixed.
 */
export function extrudePiece(
	piece: Piece,
	face: FaceRef,
	distance: number,
): Piece | null {
	const key = extrudableDimension(piece, face);
	if (!key) return null;
	const current = piece[key];
	const normal = faceNormal(piece, face.axis, face.sign);

	const build = (d: number): Piece => {
		const value = roundMm(Math.max(MIN_DIMENSION, current + d));
		const grown = value - current;
		return {
			...piece,
			[key]: value,
			position: roundVec(add(piece.position, scale(normal, grown / 2))),
		};
	};

	let result = build(distance);
	// A face pushed down must stop at the floor rather than lift the whole piece.
	const below = -lowestZ(result);
	if (below > 1e-9 && normal.z < -1e-9)
		result = build(distance - below / -normal.z);
	return clampToFloor(result);
}

/**
 * Extrudes several faces by the same distance (each along its own normal), possibly several
 * on one piece (e.g. both ends of a rail). Returns just the changed pieces, or null if any face is fixed.
 */
export function extrudeAll(
	pieces: Record<Id, Piece>,
	faces: FaceRef[],
	distance: number,
): Record<Id, Piece> | null {
	const changed: Record<Id, Piece> = {};
	for (const face of faces) {
		const piece = changed[face.pieceId] ?? pieces[face.pieceId];
		if (!piece) continue;
		const next = extrudePiece(piece, face, distance);
		if (!next) return null;
		changed[face.pieceId] = next;
	}
	return changed;
}
