import { Mesh } from "three";
import { computeMeshVolume } from "three-bvh-csg";
import { describe, expect, it } from "vitest";
import { cutGeometry } from "@/geometry/cut";
import { vec3 } from "@/geometry/vec";
import { rail, sheet } from "@/test/fixtures";

const volume = (target = sheet(), tools = [rail()]) =>
	// Typed as the Number wrapper by the library.
	Number(computeMeshVolume(new Mesh(cutGeometry(target, tools))));

/** Tools are grown by a hair (0.01 mm) to avoid slivers, so allow for that. */
const near = (actual: number, expected: number) =>
	expect(Math.abs(actual - expected)).toBeLessThan(1500);

describe("cutGeometry", () => {
	const board = 1200 * 600 * 18;

	it("cuts a housing the size of the overlap", () => {
		const housed = rail({ position: vec3(600, 300, 40.5) }); // 1000 × 38 × 9 into the board
		near(volume(sheet(), [housed]), board - 1000 * 38 * 9);
	});

	it("follows a rotated target", () => {
		// Stand the board on its long edge and push the rail into its face.
		const standing = sheet({
			position: vec3(600, 9, 300),
			rotation: vec3(90, 0, 0),
		});
		const housed = rail({ position: vec3(600, 18 + 19 - 9, 300) }); // 9 mm into y 0–18
		near(volume(standing, [housed]), board - 1000 * 9 * 63);
	});

	it("leaves the box whole when nothing overlaps", () => {
		expect(
			volume(sheet(), [rail({ position: vec3(600, 300, 500) })]),
		).toBeCloseTo(board);
	});
});
