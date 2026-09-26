import { describe, expect, it } from "vitest";
import { closestParamOnAxis, intersectPlane, type Ray } from "@/geometry/rays";

describe("closestParamOnAxis", () => {
	it("finds where a ray passes closest to an axis line", () => {
		// Looking down from above at x = 250: closest to the X axis at s = 250.
		const ray: Ray = {
			origin: { x: 250, y: 0, z: 1000 },
			direction: { x: 0, y: 0, z: -1 },
		};
		const s = closestParamOnAxis(
			ray,
			{ x: 0, y: 0, z: 0 },
			{ x: 1, y: 0, z: 0 },
		);
		expect(s).toBeCloseTo(250);
	});

	it("gives null for a ray running along the axis", () => {
		const ray: Ray = {
			origin: { x: 0, y: 0, z: 0 },
			direction: { x: 1, y: 0, z: 0 },
		};
		expect(
			closestParamOnAxis(ray, { x: 0, y: 5, z: 0 }, { x: 1, y: 0, z: 0 }),
		).toBeNull();
	});
});

describe("intersectPlane", () => {
	const floor = { normal: { x: 0, y: 0, z: 1 }, point: { x: 0, y: 0, z: 0 } };

	it("hits the plane in front of the ray", () => {
		const hit = intersectPlane(
			{ origin: { x: 10, y: 20, z: 100 }, direction: { x: 0, y: 0, z: -1 } },
			floor.normal,
			floor.point,
		);
		expect(hit).toEqual({ x: 10, y: 20, z: 0 });
	});

	it("misses a plane behind the ray or parallel to it", () => {
		const up = {
			origin: { x: 0, y: 0, z: 100 },
			direction: { x: 0, y: 0, z: 1 },
		};
		const along = {
			origin: { x: 0, y: 0, z: 100 },
			direction: { x: 1, y: 0, z: 0 },
		};
		expect(intersectPlane(up, floor.normal, floor.point)).toBeNull();
		expect(intersectPlane(along, floor.normal, floor.point)).toBeNull();
	});
});
