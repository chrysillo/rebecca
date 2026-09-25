import { add, dot, scale, sub, type Vec3 } from "./vec";

export type Ray = { origin: Vec3; direction: Vec3 };

/**
 * Parameter s of the point on the line `origin + s * axis` closest to the ray.
 * Both directions must be unit length. Returns null when the ray runs along the axis.
 */
export function closestParamOnAxis(
	ray: Ray,
	origin: Vec3,
	axis: Vec3,
): number | null {
	const b = dot(axis, ray.direction);
	const denom = 1 - b * b;
	if (denom < 1e-6) return null;
	const w = sub(origin, ray.origin);
	return (b * dot(ray.direction, w) - dot(axis, w)) / denom;
}

/** Where the ray crosses the plane through `point` with the given normal, or null if it doesn't. */
export function intersectPlane(
	ray: Ray,
	normal: Vec3,
	point: Vec3,
): Vec3 | null {
	const denom = dot(normal, ray.direction);
	if (Math.abs(denom) < 1e-6) return null;
	const t = dot(normal, sub(point, ray.origin)) / denom;
	if (t < 0) return null;
	return add(ray.origin, scale(ray.direction, t));
}
