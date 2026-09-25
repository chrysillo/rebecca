import { piecesAabb, rotateVector } from "@/geometry/box";
import { add, type Vec3 } from "@/geometry/vec";
import { pieceSize } from "@/model/dimensions";
import type { Piece, Pivot } from "@/model/types";

/** Every pivot a piece offers. */
export const PIVOTS: readonly Pivot[] = [
	"centre",
	"x-top",
	"x-mid",
	"x-bottom",
	"x+top",
	"x+mid",
	"x+bottom",
];

/** Where each pivot sits in the piece's own frame, as fractions of its half-size. */
const LOCAL: Record<Pivot, { x: number; z: number }> = {
	centre: { x: 0, z: 0 },
	"x-top": { x: -1, z: 1 },
	"x-mid": { x: -1, z: 0 },
	"x-bottom": { x: -1, z: -1 },
	"x+top": { x: 1, z: 1 },
	"x+mid": { x: 1, z: 0 },
	"x+bottom": { x: 1, z: -1 },
};

/** World position of one of a piece's pivots (its own pivot by default). */
export function pivotPoint(piece: Piece, pivot: Pivot = piece.pivot): Vec3 {
	const size = pieceSize(piece);
	const f = LOCAL[pivot];
	const local = { x: (f.x * size.x) / 2, y: 0, z: (f.z * size.z) / 2 };
	return add(piece.position, rotateVector(local, piece.rotation));
}

/**
 * World position of a pivot for several pieces together, taken from the box around them all:
 * the centre, or the top/middle/bottom of its left and right (world ±X) ends.
 */
export function groupPivotPoint(pieces: Piece[], pivot: Pivot): Vec3 {
	const { min, max } = piecesAabb(pieces);
	const f = LOCAL[pivot];
	const half = (lo: number, hi: number, t: number) =>
		(lo + hi) / 2 + (t * (hi - lo)) / 2;
	return {
		x: half(min.x, max.x, f.x),
		y: (min.y + max.y) / 2,
		z: half(min.z, max.z, f.z),
	};
}

/** A pivot's position for the current selection: the piece's own frame for one piece, the group box for several. */
export const selectionPivotPoint = (pieces: Piece[], pivot: Pivot): Vec3 =>
	pieces.length === 1
		? pivotPoint(pieces[0], pivot)
		: groupPivotPoint(pieces, pivot);
