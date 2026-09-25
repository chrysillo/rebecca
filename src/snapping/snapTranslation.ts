import type { FacePlane, Plane } from "../geometry/box";
import { dot, type Vec3 } from "../geometry/vec";

const PARALLEL = 1 - 1e-6;
const MIN_ALONG = 1e-6;

export type SnapInput = {
	/** Planes that travel with the moving geometry (a whole piece's faces, or a single face for push/pull). */
	moving: Plane[];
	/** Planes that may be snapped to. */
	targets: FacePlane[];
	/** Unit direction of travel. */
	direction: Vec3;
	/** Unsnapped distance travelled along `direction`, in mm. */
	distance: number;
	/** Maximum adjustment allowed, in mm. */
	tolerance: number;
};

export type SnapResult = { distance: number; target: FacePlane };

/**
 * Finds the travel distance, close to `distance`, at which a moving plane becomes coplanar
 * with a target plane: flush contact (opposite normals) or alignment (same normals).
 * Pure geometry: shared by the move tool now and push/pull later.
 */
export function snapTranslation(input: SnapInput): SnapResult | null {
	let best: SnapResult | null = null;
	for (const m of input.moving) {
		// How fast this plane's offset changes per mm of travel.
		const rate = dot(m.normal, input.direction);
		if (Math.abs(rate) < MIN_ALONG) continue;
		for (const t of input.targets) {
			const alignment = dot(m.normal, t.normal);
			if (Math.abs(alignment) < PARALLEL) continue;
			// Express the target in the moving plane's orientation, then solve m.offset + rate*d = targetOffset.
			const targetOffset = alignment > 0 ? t.offset : -t.offset;
			const distance = (targetOffset - m.offset) / rate;
			const error = Math.abs(distance - input.distance);
			if (error > input.tolerance) continue;
			if (!best || error < Math.abs(best.distance - input.distance))
				best = { distance, target: t };
		}
	}
	return best;
}
