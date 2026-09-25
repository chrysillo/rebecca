import type { Id } from "@/model/types";

/**
 * `target` has `tool`'s box cut out of it (a housing, notch or mortise). It references the pieces,
 * not a fixed shape, so the cut follows the tool as it moves or resizes, and vanishes while the
 * two don't overlap.
 */
export type Joint = { id: Id; target: Id; tool: Id };

/** The joints cutting into a piece. */
export const jointsCutting = (joints: Record<Id, Joint>, target: Id): Joint[] =>
	Object.values(joints).filter((j) => j.target === target);

/** True if a and b are already joined, either way round. */
export const joined = (joints: Record<Id, Joint>, a: Id, b: Id): boolean =>
	Object.values(joints).some(
		(j) => (j.target === a && j.tool === b) || (j.target === b && j.tool === a),
	);
