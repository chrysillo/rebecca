import { replacePiece } from "@/commands/pieces";
import { clampToFloor } from "@/geometry/floor";
import { roundVec, type Vec3 } from "@/geometry/vec";
import type { Id, Transform } from "@/model/types";
import type { Command } from "@/state/document";

const sameVec = (a: Vec3, b: Vec3) => a.x === b.x && a.y === b.y && a.z === b.z;

/** Sets the position and rotation of each listed piece (e.g. to commit a gizmo drag). */
export const setTransforms =
	(transforms: Record<Id, Transform>): Command =>
	(doc) => {
		let next = doc;
		for (const [id, t] of Object.entries(transforms)) {
			const piece = next.pieces[id];
			if (!piece) continue;
			const moved = clampToFloor({
				...piece,
				position: roundVec(t.position),
				rotation: t.rotation,
			});
			if (
				!sameVec(moved.position, piece.position) ||
				!sameVec(moved.rotation, piece.rotation)
			)
				next = replacePiece(next, moved);
		}
		return next;
	};
