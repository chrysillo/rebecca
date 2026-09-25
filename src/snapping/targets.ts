import { type FacePlane, pieceFacePlanes } from "../geometry/box";
import type { Id, Piece } from "../model/types";

/** The floor plane, always available as a snap target. */
export const FLOOR_PLANE: FacePlane = {
	normal: { x: 0, y: 0, z: 1 },
	offset: 0,
	face: null,
};

/** All face planes a moving set of pieces could snap to. */
export function snapTargets(pieces: Piece[], exclude: Set<Id>): FacePlane[] {
	return [
		FLOOR_PLANE,
		...pieces.filter((p) => !exclude.has(p.id)).flatMap(pieceFacePlanes),
	];
}
