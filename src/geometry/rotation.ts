import { Euler, Quaternion, Vector3 } from "three";
import { rotationQuaternion } from "@/geometry/box";
import { type Axis, axisVector, DEG } from "@/geometry/vec";
import type { Rotation } from "@/model/types";

/** Applies an extra rotation about a world axis, returning new Euler XYZ degrees. */
export function rotateAboutWorldAxis(
	rotation: Rotation,
	axis: Axis,
	degrees: number,
): Rotation {
	const a = axisVector(axis);
	const step = new Quaternion().setFromAxisAngle(
		new Vector3(a.x, a.y, a.z),
		degrees * DEG,
	);
	const result = step.multiply(rotationQuaternion(rotation));
	const e = new Euler().setFromQuaternion(result, "XYZ");
	return { x: cleanDegrees(e.x), y: cleanDegrees(e.y), z: cleanDegrees(e.z) };
}

/** Rounds to 1e-6° and normalises -0 and -180 so the panel shows stable values. */
function cleanDegrees(radians: number): number {
	const d = Math.round((radians / DEG) * 1e6) / 1e6;
	if (d === -180) return 180;
	return d === 0 ? 0 : d;
}
