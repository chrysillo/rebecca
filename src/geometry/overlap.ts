import { rotateVector } from "@/geometry/box";
import { AXES, axisVector, dot, sub, type Vec3 } from "@/geometry/vec";
import { pieceSize } from "@/model/dimensions";
import type { Piece } from "@/model/types";

/** Pieces must go at least this far (mm) into each other to count; flush faces don't. */
const MIN_DEPTH = 0.01;

const cross = (a: Vec3, b: Vec3): Vec3 => ({
	x: a.y * b.z - a.z * b.y,
	y: a.z * b.x - a.x * b.z,
	z: a.x * b.y - a.y * b.x,
});

/** A box's centre, local axes in world space, and half size along each. */
function orientedBox(piece: Piece) {
	const size = pieceSize(piece);
	return {
		centre: piece.position,
		axes: AXES.map((a) => rotateVector(axisVector(a), piece.rotation)),
		half: AXES.map((a) => size[a] / 2),
	};
}

/**
 * True if two pieces' boxes actually overlap (not just touch), by the separating axis test:
 * the boxes are apart if some axis (a face normal of either, or a cross of two edges) separates them.
 */
export function piecesOverlap(a: Piece, b: Piece): boolean {
	const A = orientedBox(a);
	const B = orientedBox(b);
	const gap = sub(B.centre, A.centre);
	const candidates = [
		...A.axes,
		...B.axes,
		...A.axes.flatMap((u) => B.axes.map((v) => cross(u, v))),
	];
	for (const axis of candidates) {
		const length = Math.hypot(axis.x, axis.y, axis.z);
		// Parallel edges give no new axis.
		if (length < 1e-6) continue;
		const radius = (box: typeof A) =>
			box.axes.reduce(
				(sum, u, i) => sum + box.half[i] * Math.abs(dot(u, axis)),
				0,
			) / length;
		const distance = Math.abs(dot(gap, axis)) / length;
		if (distance > radius(A) + radius(B) - MIN_DEPTH) return false;
	}
	return true;
}

/**
 * The shortest way to pull `b` out of `a`: a unit direction (along a face normal of either box,
 * pointing from a towards b) and how far b must move along it to stop overlapping.
 */
export function pullApart(a: Piece, b: Piece): { axis: Vec3; depth: number } {
	const A = orientedBox(a);
	const B = orientedBox(b);
	const gap = sub(B.centre, A.centre);
	let best = { axis: A.axes[0], depth: Infinity };
	for (const axis of [...A.axes, ...B.axes]) {
		const radius = (box: typeof A) =>
			box.axes.reduce(
				(sum, u, i) => sum + box.half[i] * Math.abs(dot(u, axis)),
				0,
			);
		const along = dot(gap, axis);
		const depth = radius(A) + radius(B) - Math.abs(along);
		if (depth < best.depth) {
			const sign = along < 0 ? -1 : 1;
			best = {
				axis: { x: axis.x * sign, y: axis.y * sign, z: axis.z * sign },
				depth,
			};
		}
	}
	return best;
}
