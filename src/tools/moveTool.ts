import { CONFIG } from "@/config";
import type { FacePlane } from "@/geometry/box";
import { pieceFacePlanes } from "@/geometry/box";
import { clampToFloor } from "@/geometry/floor";
import { type Axis, add, axisVector, scale, type Vec3 } from "@/geometry/vec";
import type { Id, Piece, Transform } from "@/model/types";
import { snapTranslation } from "@/snapping/snapTranslation";

export type MoveInput = {
	/** The pieces being moved, at their positions when the drag started. */
	pieces: Piece[];
	/** Everything they may snap to. */
	targets: FacePlane[];
	axis: Axis;
	/** Raw pointer travel along the axis, in mm. */
	distance: number;
	/** Fine mode: exact 1 mm steps, no object snapping. */
	fine: boolean;
	/** Snap tolerance in mm (derived from screen pixels by the caller). */
	tolerance: number;
};

export type MoveResult = {
	transforms: Record<Id, Transform>;
	snapTarget: FacePlane | null;
};

/** Turns raw pointer travel into snapped, floor-safe transforms. Pure: no store or three.js. */
export function computeMove(input: MoveInput): MoveResult {
	const direction = axisVector(input.axis);
	const { distance, snapTarget } = resolveDistance(input, direction);

	const transforms: Record<Id, Transform> = {};
	for (const piece of input.pieces) {
		const moved = clampToFloor({
			...piece,
			position: add(piece.position, scale(direction, distance)),
		});
		transforms[piece.id] = {
			position: moved.position,
			rotation: moved.rotation,
		};
	}
	return { transforms, snapTarget };
}

export type PlaneMoveInput = Omit<MoveInput, "axis" | "distance"> & {
	/** Raw pointer travel along each of the two world axes in the drag plane, in mm. */
	travel: Partial<Record<Axis, number>>;
};

/**
 * Moving a piece by dragging it across a plane: each in-plane axis is stepped and snapped on its
 * own (as if dragging that gizmo arrow), then the two are combined.
 */
export function computePlaneMove(input: PlaneMoveInput): MoveResult {
	let offset: Vec3 = { x: 0, y: 0, z: 0 };
	let snapTarget: FacePlane | null = null;
	for (const [axis, distance] of Object.entries(input.travel) as [
		Axis,
		number,
	][]) {
		const direction = axisVector(axis);
		const resolved = resolveDistance({ ...input, axis, distance }, direction);
		offset = add(offset, scale(direction, resolved.distance));
		snapTarget ??= resolved.snapTarget;
	}

	const transforms: Record<Id, Transform> = {};
	for (const piece of input.pieces) {
		const moved = clampToFloor({
			...piece,
			position: add(piece.position, offset),
		});
		transforms[piece.id] = {
			position: moved.position,
			rotation: moved.rotation,
		};
	}
	return { transforms, snapTarget };
}

function resolveDistance(
	input: MoveInput,
	direction: Vec3,
): { distance: number; snapTarget: FacePlane | null } {
	if (input.fine)
		return {
			distance: roundTo(input.distance, CONFIG.move.fineStep),
			snapTarget: null,
		};

	const snap = snapTranslation({
		moving: input.pieces.flatMap(pieceFacePlanes),
		targets: input.targets,
		direction,
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
