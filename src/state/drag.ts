import type { FacePlane } from "@/geometry/box";
import type { Axis } from "@/geometry/vec";
import type { Id, Transform } from "@/model/types";

/** Transient state of an in-progress gizmo drag. Never stored in history. */
export type DragState = {
	/** Previewed transform for each dragged piece. */
	preview: Record<Id, Transform>;
	/** When true, the dragged pieces are copies; the originals stay put. */
	duplicate: boolean;
	/** The face currently being snapped to, for the snap guide. */
	snapTarget: FacePlane | null;
	/** For a rotation drag: where it started and the (stepped) angle so far, for the on-gizmo readout. */
	rotation: { axis: Axis; startAngle: number; degrees: number } | null;
};
