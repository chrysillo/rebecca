import { describe, expect, it } from "vitest";
import type { FaceRef } from "@/geometry/box";
import { pieceAabb } from "@/geometry/box";
import {
	coplanarFaceGroups,
	extrudableFaces,
	extrudeAll,
	extrudePiece,
} from "@/geometry/extrude";
import { lowestZ } from "@/geometry/floor";
import { vec3 } from "@/geometry/vec";
import { defined, rail, sheet } from "@/test/fixtures";

const end: FaceRef = { pieceId: "rail", axis: "x", sign: 1 };
const start: FaceRef = { pieceId: "rail", axis: "x", sign: -1 };
const side: FaceRef = { pieceId: "rail", axis: "y", sign: 1 };

describe("extrudePiece", () => {
	it("pushes one face out, leaving the opposite face where it was", () => {
		const longer = defined(extrudePiece(rail(), end, 100));
		expect(longer.kind === "framing" && longer.length).toBe(1100);
		expect(pieceAabb(longer).min.x).toBeCloseTo(0);
		expect(pieceAabb(longer).max.x).toBeCloseTo(1100);
	});

	it("refuses faces whose dimension is fixed (rail sides, sheet faces)", () => {
		expect(extrudePiece(rail(), side, 50)).toBeNull();
		expect(
			extrudePiece(sheet(), { pieceId: "sheet", axis: "z", sign: 1 }, 5),
		).toBeNull();
	});

	it("never shrinks below 1 mm", () => {
		const tiny = extrudePiece(rail(), end, -5000);
		expect(tiny?.kind === "framing" && tiny.length).toBe(1);
	});

	it("stops a face pushed down at the floor instead of lifting the piece", () => {
		// Standing upright: rotating 90° about Y points the rail's +X end straight down.
		const upright = rail({
			rotation: vec3(0, 90, 0),
			position: vec3(0, 19, 500),
		});
		const pushed = defined(extrudePiece(upright, end, 100));
		expect(lowestZ(pushed)).toBeCloseTo(0);
		expect(pushed.kind === "framing" && pushed.length).toBeCloseTo(1000);
	});
});

describe("extrudeAll", () => {
	it("moves several faces by the same distance, including both ends of one piece", () => {
		const changed = extrudeAll({ rail: rail() }, [start, end], 50);
		const r = changed?.rail;
		expect(r?.kind === "framing" && r.length).toBe(1100);
		expect(r?.position.x).toBeCloseTo(500); // grew equally at both ends
	});

	it("refuses the whole extrude if any face is fixed", () => {
		expect(extrudeAll({ rail: rail() }, [end, side], 50)).toBeNull();
	});
});

describe("extrudableFaces", () => {
	it("is a sheet's four edges and a rail's two ends", () => {
		expect(extrudableFaces(sheet()).map((f) => `${f.axis}${f.sign}`)).toEqual([
			"x-1",
			"x1",
			"y-1",
			"y1",
		]);
		expect(extrudableFaces(rail())).toEqual([start, end]);
	});
});

describe("coplanarFaceGroups", () => {
	it("groups ends lying in one plane, and keeps others apart", () => {
		const beside = rail({
			id: "beside",
			position: { x: 500, y: 219, z: 31.5 },
		});
		const shorter = rail({
			id: "shorter",
			length: 900,
			position: { x: 450, y: 419, z: 31.5 },
		});
		const groups = coplanarFaceGroups([rail(), beside, shorter]);
		const ids = groups.map((g) => g.map((f) => `${f.pieceId}${f.sign}`));
		expect(ids).toEqual([
			["rail-1", "beside-1", "shorter-1"],
			["rail1", "beside1"],
			["shorter1"],
		]);
	});

	it("keeps faces in one plane but pointing opposite ways apart", () => {
		const facing = rail({
			id: "facing",
			position: { x: 1500, y: 19, z: 31.5 },
		});
		expect(coplanarFaceGroups([rail(), facing])).toHaveLength(4);
	});
});
