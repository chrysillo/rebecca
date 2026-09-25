import { BoxGeometry } from "three";
import { describe, expect, it } from "vitest";
import { cutGeometry } from "@/geometry/cut";
import { featureEdges } from "@/geometry/edges";
import { vec3 } from "@/geometry/vec";
import { rail, sheet } from "@/test/fixtures";

/** Segment midpoints, as [x, y, z]. */
const midpoints = (flat: number[]) => {
	const out: number[][] = [];
	for (let i = 0; i < flat.length; i += 6)
		out.push([0, 1, 2].map((k) => (flat[i + k] + flat[i + 3 + k]) / 2));
	return out;
};

describe("featureEdges", () => {
	it("outlines a box with its 12 edges", () => {
		expect(featureEdges(new BoxGeometry(10, 20, 30)).length / 6).toBe(12);
	});

	it("draws only real corners on a cut piece, none across flat faces", () => {
		// A rail laid across the board (along y), 9 mm into its top: a through housing.
		const housed = rail({
			position: vec3(600, 300, 40.5),
			rotation: vec3(0, 0, 90),
		});
		const edges = featureEdges(cutGeometry(sheet(), [housed]));
		// In the board's own frame every true edge lies on two of these planes (0.01 mm clearance aside).
		const planes = {
			x: [-600, 600, -19, 19],
			y: [-300, 300],
			z: [-9, 9, 0],
		};
		const onPlanes = (p: number[]) =>
			(["x", "y", "z"] as const).filter((axis, i) =>
				planes[axis].some((v) => Math.abs(p[i] - v) < 0.05),
			).length;
		const stray = midpoints(edges).filter((m) => onPlanes(m) < 2);
		expect(stray).toEqual([]);
		// The housing's floor and walls are outlined too.
		expect(midpoints(edges).some((m) => Math.abs(m[2]) < 0.05)).toBe(true);
	});
});
