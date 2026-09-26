import { describe, expect, it } from "vitest";
import { pieceAabb } from "@/geometry/box";
import { overlapBox, piecesOverlap } from "@/geometry/overlap";
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

describe("overlapBox", () => {
	const housed = rail({ position: vec3(600, 300, 40.5) }); // z 9–72, 9 mm into the board

	it("is the part of a housed rail buried in the board, in the rail's frame", () => {
		const box = overlapBox(board, housed);
		expect(box?.min).toEqual({ x: -500, y: -19, z: -31.5 });
		expect(box?.max.z).toBeCloseTo(-22.5); // 9 mm up from the rail's underside
	});

	it("is only the stretch of a long rail that crosses a narrow target", () => {
		const strip = sheet({
			id: "strip",
			length: 38,
			position: vec3(500, 300, 9),
		}); // x 481–519
		const box = overlapBox(strip, housed);
		expect(box?.min.x).toBeCloseTo(-119);
		expect(box?.max.x).toBeCloseTo(-81);
	});

	it("follows the tool's rotation", () => {
		// Turned to run along Y: its local X (length) is world Y, clipped to the board's 600 mm.
		const turned = rail({
			position: vec3(600, 300, 40.5),
			rotation: vec3(0, 0, 90),
		});
		const box = overlapBox(board, turned);
		expect(box?.min.x).toBeCloseTo(-300);
		expect(box?.max.x).toBeCloseTo(300);
	});

	it("gives nothing for pieces that only touch", () => {
		const onTop = rail({ position: vec3(600, 300, 18 + 31.5) });
		expect(overlapBox(board, onTop)).toBeNull();
	});
});
