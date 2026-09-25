import type { FacePlane, FaceRef } from "@/geometry/box";

/** Transient state of an in-progress face extrude (push/pull). Never stored in history. */
export type ExtrudeState = {
	/** Every face that moves. The last one is the primary: it follows the mouse, snaps and shows the readout. */
	faces: FaceRef[];
	/** Pointer position along the face normal when extruding began; null until the viewport measures it. */
	startParam: number | null;
	/** Current stepped/snapped distance from the mouse, in mm. Positive grows the piece. */
	distance: number;
	/** Characters typed for an exact distance; when it parses, it overrides the mouse. */
	typed: string;
	/** The face currently being snapped to, for the snap guide. */
	snapTarget: FacePlane | null;
};

/** The face that drives an extrude (the last one clicked). */
export const primaryFace = (e: ExtrudeState): FaceRef =>
	e.faces[e.faces.length - 1];

/** The distance that will be applied: the typed value if valid, else the mouse distance. */
export function effectiveDistance(e: ExtrudeState): number {
	const typed = Number(e.typed);
	return e.typed.trim() !== "" && Number.isFinite(typed) ? typed : e.distance;
}
