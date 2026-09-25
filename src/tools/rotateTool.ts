import { CONFIG } from "@/config";
import { rotateVector } from "@/geometry/box";
import { clampToFloor } from "@/geometry/floor";
import { rotateAboutWorldAxis } from "@/geometry/rotation";
import { type Axis, add, sub, type Vec3 } from "@/geometry/vec";
import type { Id, Piece, Transform } from "@/model/types";

export type RotateInput = {
	/** The pieces being rotated, as they were when the drag started. */
	pieces: Piece[];
	axis: Axis;
	/** The point everything turns around (the selection centre). */
	pivot: Vec3;
	/** Raw pointer angle travelled, in degrees. */
	degrees: number;
	/** Fine mode uses the small angle step. */
	fine: boolean;
};

export type RotateResult = {
	transforms: Record<Id, Transform>;
	degrees: number;
};

/** Turns raw pointer rotation into stepped, floor-safe transforms. Pure: no store or rendering. */
export function computeRotation(input: RotateInput): RotateResult {
	const step = input.fine ? CONFIG.rotate.fineStep : CONFIG.rotate.step;
	const degrees = Math.round(input.degrees / step) * step;
	const turn = { x: 0, y: 0, z: 0, [input.axis]: degrees };

	const transforms: Record<Id, Transform> = {};
	for (const piece of input.pieces) {
		const offset = rotateVector(sub(piece.position, input.pivot), turn);
		const turned = clampToFloor({
			...piece,
			position: add(input.pivot, offset),
			rotation: rotateAboutWorldAxis(piece.rotation, input.axis, degrees),
		});
		transforms[piece.id] = {
			position: turned.position,
			rotation: turned.rotation,
		};
	}
	return { transforms, degrees };
}

/** Signed angle (degrees) of a point around an axis through `centre`, measured right-handed. */
export function angleAround(axis: Axis, centre: Vec3, point: Vec3): number {
	const d = sub(point, centre);
	const [u, v] = PLANE_AXES[axis];
	return (Math.atan2(d[v], d[u]) * 180) / Math.PI;
}

/** In-plane axes for each rotation axis, ordered so positive angles follow the right-hand rule. */
const PLANE_AXES: Record<Axis, [Axis, Axis]> = {
	x: ["y", "z"],
	y: ["z", "x"],
	z: ["x", "y"],
};
