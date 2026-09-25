import { describe, expect, it } from "vitest";
import { pieceFacePlanes } from "@/geometry/box";
import { vec3 } from "@/geometry/vec";
import { snapTranslation } from "@/snapping/snapTranslation";
import { snapTargets } from "@/snapping/targets";
import { rail } from "@/test/fixtures";

// Rail A spans x 0..1000; rail B starts 100 mm further along, spanning x 1100..2100.
const a = rail({ id: "a" });
const b = rail({ id: "b", position: { x: 1600, y: 19, z: 31.5 } });
const targets = snapTargets([a, b], new Set(["b"]));
const alongX = vec3(1, 0, 0);

describe("snapTranslation", () => {
	it("snaps a moving piece flush against a facing face", () => {
		const snap = snapTranslation({
			moving: pieceFacePlanes(b),
			targets,
			direction: alongX,
			distance: -97,
			tolerance: 10,
		});
		expect(snap?.distance).toBeCloseTo(-100);
		expect(snap?.target.face).toEqual({ pieceId: "a", axis: "x", sign: 1 });
	});

	it("aligns faces that point the same way", () => {
		const offset = rail({ id: "c", position: { x: 500, y: 24, z: 31.5 } }); // 5 mm off in Y
		const snap = snapTranslation({
			moving: pieceFacePlanes(offset),
			targets: snapTargets([a], new Set()),
			direction: vec3(0, 1, 0),
			distance: -4,
			tolerance: 10,
		});
		expect(snap?.distance).toBeCloseTo(-5);
	});

	it("does nothing when no face is within tolerance", () => {
		const snap = snapTranslation({
			moving: pieceFacePlanes(b),
			targets,
			direction: alongX,
			distance: -60,
			tolerance: 10,
		});
		expect(snap).toBeNull();
	});

	it("ignores planes the move can't reach (perpendicular to the direction)", () => {
		const xFacing = pieceFacePlanes(b).filter(
			(p) => Math.abs(p.normal.x) === 1,
		);
		const snap = snapTranslation({
			moving: xFacing,
			targets,
			direction: vec3(0, 1, 0),
			distance: 3,
			tolerance: 50,
		});
		expect(snap).toBeNull();
	});

	it("snaps rotated pieces by their actual face planes", () => {
		// B turned 90° about Z: its 38 mm-wide sides now face ±X, the -X side at x = 1481.
		const turned = rail({
			id: "b",
			position: { x: 1500, y: 19, z: 31.5 },
			rotation: vec3(0, 0, 90),
		});
		const snap = snapTranslation({
			moving: pieceFacePlanes(turned),
			targets,
			direction: alongX,
			distance: -470,
			tolerance: 20,
		});
		expect(snap?.distance).toBeCloseTo(-481);
	});

	it("always offers the floor", () => {
		const lifted = rail({ id: "b", position: { x: 1600, y: 19, z: 131.5 } }); // 100 mm up
		const snap = snapTranslation({
			moving: pieceFacePlanes(lifted),
			targets,
			direction: vec3(0, 0, 1),
			distance: -95,
			tolerance: 10,
		});
		expect(snap?.distance).toBeCloseTo(-100);
		expect(snap?.target.face).toBeNull();
	});
});
