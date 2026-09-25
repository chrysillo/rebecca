import { BoxGeometry, type BufferGeometry, Matrix4, Vector3 } from "three";
import { Brush, Evaluator, INTERSECTION, SUBTRACTION } from "three-bvh-csg";
import { rotationQuaternion } from "@/geometry/box";
import { piecesOverlap } from "@/geometry/overlap";
import { pieceSize } from "@/model/dimensions";
import type { Piece } from "@/model/types";

/**
 * Tools are grown by this much (mm) on every side, so a cut that ends exactly on the target's
 * surface (a shelf flush with a side's front edge) doesn't leave a paper-thin skin.
 */
const CLEARANCE = 0.01;

const box = (piece: Piece, grow = 0) => {
	const s = pieceSize(piece);
	return new BoxGeometry(s.x + grow * 2, s.y + grow * 2, s.z + grow * 2);
};

const matrix = (piece: Piece) =>
	new Matrix4().compose(
		new Vector3(piece.position.x, piece.position.y, piece.position.z),
		rotationQuaternion(piece.rotation),
		new Vector3(1, 1, 1),
	);

const evaluator = new Evaluator();
evaluator.attributes = ["position", "normal"];
evaluator.useGroups = false;

/**
 * The target's shape, in its own frame (centred, unrotated), with every overlapping tool's box
 * cut out of it. A plain box when nothing overlaps.
 */
export function cutGeometry(target: Piece, tools: Piece[]): BufferGeometry {
	const cutting = tools.filter((t) => piecesOverlap(target, t));
	if (cutting.length === 0) return box(target);

	const toTarget = matrix(target).invert();
	let result = new Brush(box(target));
	result.updateMatrixWorld();
	for (const tool of cutting) {
		const brush = new Brush(box(tool, CLEARANCE));
		// Place the tool relative to the target, so the result comes out in the target's frame.
		brush.applyMatrix4(new Matrix4().multiplyMatrices(toTarget, matrix(tool)));
		brush.updateMatrixWorld();
		const next = evaluator.evaluate(result, brush, SUBTRACTION);
		result.geometry.dispose();
		brush.geometry.dispose();
		result = next;
	}
	return result.geometry;
}

/** The material a tool would remove from the target (their overlap), in the target's frame. */
export function overlapGeometry(target: Piece, tool: Piece): BufferGeometry {
	const a = new Brush(box(target));
	a.updateMatrixWorld();
	const b = new Brush(box(tool));
	b.applyMatrix4(
		new Matrix4().multiplyMatrices(matrix(target).invert(), matrix(tool)),
	);
	b.updateMatrixWorld();
	const result = evaluator.evaluate(a, b, INTERSECTION);
	a.geometry.dispose();
	b.geometry.dispose();
	return result.geometry;
}
