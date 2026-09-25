import { describe, expect, it } from "vitest";
import { pieceAabb } from "@/geometry/box";
import { piecesOverlap, pullApart } from "@/geometry/overlap";
import { vec3 } from "@/geometry/vec";
import { rail, sheet } from "@/test/fixtures";

// The sheet lies flat: x 0–1200, y 0–600, z 0–18.
const board = sheet();

describe("piecesOverlap", () => {
	it("finds a rail pressed 9 mm into the board", () => {
		const housed = rail({ position: vec3(600, 300, 40.5) }); // z 9–72
		expect(piecesOverlap(board, housed)).toBe(true);
		expect(piecesOverlap(housed, board)).toBe(true);
	});

	it("doesn't count a rail sitting flush on top", () => {
		const onTop = rail({ position: vec3(600, 300, 18 + 31.5) });
		expect(piecesOverlap(board, onTop)).toBe(false);
	});

	it("uses the real (rotated) boxes, not their bounding boxes", () => {
		// Turned 45° just past the board's corner: the bounding boxes overlap, the pieces don't.
		const d = 1300 / Math.SQRT2;
		const turned = rail({
			position: vec3(d, d, 9),
			rotation: vec3(0, 0, -45),
		});
		const a = pieceAabb(board);
		const b = pieceAabb(turned);
		expect(b.min.y < a.max.y && b.min.x < a.max.x).toBe(true);
		expect(piecesOverlap(board, turned)).toBe(false);
	});
});

describe("pullApart", () => {
	it("pulls a housed rail straight up out of its 9 mm housing", () => {
		const housed = rail({ position: vec3(600, 300, 40.5) });
		const { axis, depth } = pullApart(board, housed);
		expect(axis.z).toBeCloseTo(1);
		expect(depth).toBeCloseTo(9);
	});
});
