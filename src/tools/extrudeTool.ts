import { CONFIG } from "@/config";
import {
	type FacePlane,
	type FaceRef,
	faceNormal,
	pieceFacePlanes,
	sameFace,
} from "@/geometry/box";
import type { ScreenPoint } from "@/input/pointer";
import type { Piece } from "@/model/types";
import { snapTranslation } from "@/snapping/snapTranslation";

export type ExtrudeInput = {
	piece: Piece;
	face: FaceRef;
	/** Everything the moving face may snap to. */
	targets: FacePlane[];
	/** Raw pointer travel along the face normal, in mm. */
	distance: number;
	/** Fine mode: exact 1 mm steps, no snapping. */
	fine: boolean;
	/** Snap tolerance in mm. */
	tolerance: number;
};

/** Turns raw pointer travel into a stepped or snapped extrude distance. Pure. */
export function computeExtrude(input: ExtrudeInput): {
	distance: number;
	snapTarget: FacePlane | null;
} {
	const { piece, face } = input;
	if (input.fine)
		return {
			distance: roundTo(input.distance, CONFIG.move.fineStep),
			snapTarget: null,
		};

	const moving = pieceFacePlanes(piece).filter((p) => sameFace(p.face, face));
	const snap = snapTranslation({
		moving,
		targets: input.targets,
		direction: faceNormal(piece, face.axis, face.sign),
		distance: input.distance,
		tolerance: input.tolerance,
	});
	if (snap) return { distance: snap.distance, snapTarget: snap.target };
	return {
		distance: roundTo(input.distance, CONFIG.move.step),
		snapTarget: null,
	};
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** A face with where its centre appears on screen (null when behind the camera). */
export type FaceOnScreen = { face: FaceRef; at: ScreenPoint | null };

/**
 * Faces ordered by how near their centre is to the pointer on screen, nearest first. E on a
 * selected piece extrudes the first; Tab steps through the rest. Faces off screen go last.
 */
export function facesNearestPointer(
	faces: FaceOnScreen[],
	pointer: ScreenPoint,
): FaceRef[] {
	const distance = ({ at }: FaceOnScreen) =>
		at ? Math.hypot(at.x - pointer.x, at.y - pointer.y) : Infinity;
	return (
		[...faces]
			// `|| 0` keeps two off-screen faces (Infinity − Infinity) in their original order.
			.sort((a, b) => distance(a) - distance(b) || 0)
			.map((f) => f.face)
	);
}
