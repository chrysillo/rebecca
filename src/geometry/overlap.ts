import { type Aabb, rotateVector } from "@/geometry/box";
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
 * Join preview: where `tool` overlaps `target` (the part the cut removes from the target), as a
 * box in `tool`'s local frame (centred on the tool, before its rotation). Exact when the two are
 * square to each other; otherwise the smallest such box holding the overlap. Null if they don't overlap.
 */
export function overlapBox(target: Piece, tool: Piece): Aabb | null {
	const A = orientedBox(target);
	const B = orientedBox(tool);
	const offset = sub(A.centre, B.centre);
	const min = { x: 0, y: 0, z: 0 };
	const max = { x: 0, y: 0, z: 0 };
	for (const [j, u] of B.axes.entries()) {
		// The target's extent along this tool axis, clipped to the tool's own.
		const mid = dot(offset, u);
		const radius = A.axes.reduce(
			(sum, a, i) => sum + A.half[i] * Math.abs(dot(a, u)),
			0,
		);
		min[AXES[j]] = Math.max(-B.half[j], mid - radius);
		max[AXES[j]] = Math.min(B.half[j], mid + radius);
		if (max[AXES[j]] - min[AXES[j]] < MIN_DEPTH) return null;
	}
	return { min, max };
}
