import type { FacePlane } from "../geometry/box";
import type { Id, Transform } from "../model/types";

/** Transient state of an in-progress gizmo drag. Never stored in history. */
export type DragState = {
	/** Previewed transform for each dragged piece. */
	preview: Record<Id, Transform>;
	/** When true, the dragged pieces are copies; the originals stay put. */
	duplicate: boolean;
	/** The face currently being snapped to, for the snap guide. */
	snapTarget: FacePlane | null;
};
