import type { Aabb } from "@/geometry/box";
import { AXES, type Vec3 } from "@/geometry/vec";

/**
 * Diagonal hatching across all six faces of a box centred on the origin, `spacing` mm apart
 * along each face edge. Returns segment endpoints as a flat [x, y, z, x, y, z, …] list.
 */
export function boxHatch(size: Vec3, spacing: number): number[] {
	const out: number[] = [];
	for (const normal of AXES) {
		const [u, v] = AXES.filter((a) => a !== normal);
		const hu = size[u] / 2;
		const hv = size[v] / 2;
		for (const sign of [-1, 1]) {
			// Lines u = v + c, clipped to the face; c steps from one corner to the opposite one.
			const first = Math.ceil(-(hu + hv) / spacing + 1e-9) * spacing;
			for (let c = first; c < hu + hv - 1e-9; c += spacing) {
				const lo = Math.max(-hv, -hu - c);
				const hi = Math.min(hv, hu - c);
				if (hi - lo < 1e-9) continue;
				for (const t of [lo, hi]) {
					const p = { x: 0, y: 0, z: 0 };
					p[normal] = (sign * size[normal]) / 2;
					p[u] = t + c;
					p[v] = t;
					out.push(p.x, p.y, p.z);
				}
			}
		}
	}
	return out;
}

/** How far (mm) past `box` a line still counts as inside it, so lines lying on its faces go too. */
const ON_BOX = 0.01;

/** Drops the parts of line segments (a flat [x, y, z, x, y, z, …] list) that lie inside `box`. */
export function clipOutside(segments: number[], box: Aabb): number[] {
	const out: number[] = [];
	for (let i = 0; i < segments.length; i += 6) {
		const a = segments.slice(i, i + 3);
		const b = segments.slice(i + 3, i + 6);
		// Where the segment enters and leaves the box, as fractions along it.
		let enter = 0;
		let exit = 1;
		for (const [k, axis] of AXES.entries()) {
			const lo = box.min[axis] - ON_BOX;
			const hi = box.max[axis] + ON_BOX;
			const d = b[k] - a[k];
			if (Math.abs(d) < 1e-12) {
				if (a[k] < lo || a[k] > hi) enter = Infinity;
				continue;
			}
			const t0 = (lo - a[k]) / d;
			const t1 = (hi - a[k]) / d;
			enter = Math.max(enter, Math.min(t0, t1));
			exit = Math.min(exit, Math.max(t0, t1));
		}
		const at = (t: number) => a.map((n, k) => n + (b[k] - n) * t);
		if (enter >= exit) {
			out.push(...a, ...b);
			continue;
		}
		if (enter > 1e-9) out.push(...a, ...at(enter));
		if (exit < 1 - 1e-9) out.push(...at(exit), ...b);
	}
	return out;
}
