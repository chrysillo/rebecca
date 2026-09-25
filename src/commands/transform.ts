import { pieceAabb } from "../geometry/box";
import { clampToFloor } from "../geometry/floor";
import { type Axis, roundVec, type Vec3 } from "../geometry/vec";
import type { Id, Rotation, Transform } from "../model/types";
import type { Command } from "../state/document";
import { replacePiece } from "./pieces";

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

export const setRotation =
	(id: Id, rotation: Rotation): Command =>
	(doc) => {
		const piece = doc.pieces[id];
		if (!piece) return doc;
		return setTransforms({ [id]: { position: piece.position, rotation } })(doc);
	};

/**
 * Moves a piece so the minimum corner of its bounding box sits at `value` on one world axis.
 * This is the position shown in the properties panel ("where does this piece start?").
 */
export const setCornerCoordinate =
	(id: Id, axis: Axis, value: number): Command =>
	(doc) => {
		const piece = doc.pieces[id];
		if (!piece) return doc;
		const shift = value - pieceAabb(piece).min[axis];
		const position = {
			...piece.position,
			[axis]: piece.position[axis] + shift,
		};
		return setTransforms({ [id]: { position, rotation: piece.rotation } })(doc);
	};
