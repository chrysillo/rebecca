import type { Camera } from "three";
import { Vector2, Vector3 } from "three";
import {
	type EdgeRef,
	edgeEnds,
	type FaceRef,
	faceEdges,
} from "@/geometry/box";
import type { Piece } from "@/model/types";

/**
 * The edge of the hovered face nearest the pointer on screen (in pixels, not mm), so pointing
 * near a rail's short end picks that end even though the long edges are closer in millimetres.
 */
export function pickEdge(
	piece: Piece,
	face: FaceRef,
	camera: Camera,
	pointer: Vector2, // normalised device coordinates, as in R3F events
	size: { width: number; height: number },
): EdgeRef {
	const toPixels = (p: { x: number; y: number; z: number }) => {
		const v = new Vector3(p.x, p.y, p.z).project(camera);
		return new Vector2(
			((v.x + 1) / 2) * size.width,
			((1 - v.y) / 2) * size.height,
		);
	};
	const mouse = new Vector2(
		((pointer.x + 1) / 2) * size.width,
		((1 - pointer.y) / 2) * size.height,
	);

	let best = faceEdges(face)[0];
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const edge of faceEdges(face)) {
		const [a, b] = edgeEnds(piece, edge).map(toPixels);
		const d = distanceToSegment(mouse, a, b);
		if (d < bestDistance) [best, bestDistance] = [edge, d];
	}
	return best;
}

function distanceToSegment(p: Vector2, a: Vector2, b: Vector2): number {
	const ab = b.clone().sub(a);
	const t = Math.max(
		0,
		Math.min(1, p.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-9)),
	);
	return p.distanceTo(a.clone().add(ab.multiplyScalar(t)));
}
