import { describe, expect, it } from "vitest";
import { faceFromLocalNormal, pieceAabb } from "@/geometry/box";
import { clampToFloor, lowestZ } from "@/geometry/floor";
import { groupPivotPoint, pivotPoint } from "@/geometry/pivot";
import { resizePiece } from "@/geometry/resize";
import { rotateAboutWorldAxis } from "@/geometry/rotation";
import { vec3 } from "@/geometry/vec";
import { rail, sheet } from "@/test/fixtures";

describe("clampToFloor", () => {
	it("raises a piece that dips below the floor", () => {
		expect(clampToFloor(rail({ position: vec3(500, 19, 0) })).position.z).toBe(
			31.5,
		);
	});

	it("leaves a piece already on or above the floor alone", () => {
		const r = rail();
		expect(clampToFloor(r)).toBe(r);
	});

	it("never leaves a rotated piece below the floor after rounding", () => {
		const tilted = rail({
			rotation: vec3(33, 0, 0),
			position: vec3(500, 19, 0),
		});
		expect(lowestZ(clampToFloor(tilted))).toBeGreaterThanOrEqual(0);
	});
});

describe("rotateAboutWorldAxis", () => {
	it("adds steps about a world axis", () => {
		expect(rotateAboutWorldAxis(vec3(0, 0, 45), "z", 45)).toEqual(
			vec3(0, 0, 90),
		);
	});

	it("comes back to zero after a full turn in 45° steps", () => {
		let r = vec3();
		for (let i = 0; i < 8; i++) r = rotateAboutWorldAxis(r, "z", 45);
		expect(r).toEqual(vec3(0, 0, 0));
	});
});

describe("resizePiece", () => {
	it("keeps the piece's start in place when it gets shorter", () => {
		const shorter = resizePiece(rail(), { length: 800 });
		expect(pieceAabb(shorter).min.x).toBeCloseTo(0);
		expect(pieceAabb(shorter).max.x).toBeCloseTo(800);
	});

	it("thickens a sheet upward, keeping its underside on the floor", () => {
		const thicker = resizePiece(sheet(), { thickness: 19 });
		expect(pieceAabb(thicker).min.z).toBeCloseTo(0);
		expect(pieceAabb(thicker).max.z).toBeCloseTo(19);
	});
});

describe("pivots", () => {
	it("puts end pivots at the top, middle and bottom of each end", () => {
		const r = rail();
		expect(pivotPoint(r, "centre")).toEqual(vec3(500, 19, 31.5));
		expect(pivotPoint(r, "x-top")).toEqual(vec3(0, 19, 63));
		expect(pivotPoint(r, "x+mid")).toEqual(vec3(1000, 19, 31.5));
		expect(pivotPoint(r, "x+bottom")).toEqual(vec3(1000, 19, 0));
	});

	it("follows the piece's rotation", () => {
		const turned = rail({ rotation: vec3(0, 0, 90) });
		const end = pivotPoint(turned, "x+mid");
		expect(end.x).toBeCloseTo(500);
		expect(end.y).toBeCloseTo(519);
	});

	it("uses the box around all pieces for a group", () => {
		const group = [rail(), sheet({ position: vec3(1700, 300, 9) })]; // sheet spans x 1100..2300
		expect(groupPivotPoint(group, "x+bottom")).toEqual(vec3(2300, 300, 0));
		expect(groupPivotPoint(group, "centre")).toEqual(vec3(1150, 300, 31.5));
	});
});

describe("faceFromLocalNormal", () => {
	it("names the face by its dominant local axis and side", () => {
		expect(faceFromLocalNormal("p", vec3(0, 0, -1))).toEqual({
			pieceId: "p",
			axis: "z",
			sign: -1,
		});
		expect(faceFromLocalNormal("p", vec3(0.999, 0.01, 0))).toEqual({
			pieceId: "p",
			axis: "x",
			sign: 1,
		});
	});
});
