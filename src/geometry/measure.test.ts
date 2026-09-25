import { describe, expect, it } from "vitest";
import { edgeMidpoint, faceEdges } from "@/geometry/box";
import {
	axisGaps,
	formatMm,
	measureEdges,
	stackDimensions,
} from "@/geometry/measure";
import { vec3 } from "@/geometry/vec";
import { rail, sheet } from "@/test/fixtures";

// Rail A spans x 0..1000; rail B spans x 1450..2450 (a 450 mm gap), both at y 0..38, z 0..63.
const a = rail({ id: "a" });
const b = rail({ id: "b", position: vec3(1950, 19, 31.5) });
const pieces = { a, b };

// Edge helpers for rail-shaped pieces: the top edge across each end, running along Y.
const topOfEnd = (pieceId: string, end: 1 | -1) => ({
	pieceId,
	axis: "y" as const,
	u: end,
	v: 1 as const,
});

describe("edges", () => {
	it("finds an edge's midpoint", () => {
		expect(edgeMidpoint(a, topOfEnd("a", 1))).toEqual(vec3(1000, 19, 63));
		expect(edgeMidpoint(a, { pieceId: "a", axis: "z", u: 1, v: -1 })).toEqual(
			vec3(1000, 0, 31.5),
		);
	});

	it("lists the four edges around a face", () => {
		const edges = faceEdges({ pieceId: "a", axis: "x", sign: 1 });
		expect(edges).toHaveLength(4);
		// Every edge of the +X end face sits on that end.
		for (const e of edges) expect(edgeMidpoint(a, e).x).toBeCloseTo(1000);
		expect(edges).toContainEqual(topOfEnd("a", 1));
	});
});

describe("measureEdges", () => {
	it("measures from the middle of one edge to the middle of the next", () => {
		const d = measureEdges(pieces, topOfEnd("a", 1), topOfEnd("b", -1));
		expect(d?.start).toEqual(vec3(1000, 19, 63));
		expect(d?.end).toEqual(vec3(1450, 19, 63));
		expect(d?.distance).toBeCloseTo(450);
	});

	it("stays straight when the edges are offset (never diagonal)", () => {
		const offset = { a, c: rail({ id: "c", position: vec3(1950, 319, 31.5) }) }; // 300 mm further along Y
		const d = measureEdges(offset, topOfEnd("a", 1), topOfEnd("c", -1));
		expect(d?.distance).toBeCloseTo(450);
		expect(d?.end).toEqual(vec3(1450, 19, 63)); // straight along X from the first edge
	});

	it("measures along one piece (end to end)", () => {
		expect(
			measureEdges(pieces, topOfEnd("a", -1), topOfEnd("a", 1))?.distance,
		).toBeCloseTo(1000);
	});

	it("follows the pieces when they move", () => {
		const moved = { a, b: { ...b, position: vec3(1750, 19, 31.5) } }; // B now starts at x = 1250
		expect(
			measureEdges(moved, topOfEnd("a", 1), topOfEnd("b", -1))?.distance,
		).toBeCloseTo(250);
	});

	it("gives nothing if a piece has been deleted", () => {
		expect(measureEdges({ a }, topOfEnd("a", 1), topOfEnd("b", -1))).toBeNull();
	});
});

describe("axisGaps (live distances while dragging)", () => {
	it("finds the nearest piece ahead and behind along the drag axis", () => {
		const c = rail({ id: "c", position: vec3(-700, 19, 31.5) }); // spans x -1200..-200
		const gaps = axisGaps([a], [b, c], "x");
		expect(gaps.map((g) => g.distance).sort((m, n) => m - n)).toEqual([
			200, 450,
		]);
	});

	it("ignores pieces that aren't in line across the other axes", () => {
		const offToTheSide = rail({ id: "d", position: vec3(1950, 800, 31.5) });
		expect(axisGaps([a], [offToTheSide], "x")).toEqual([]);
	});

	it("measures down to the floor when moving vertically with nothing below", () => {
		const lifted = sheet({ position: vec3(600, 300, 109) }); // underside at z = 100
		const [gap] = axisGaps([lifted], [], "z");
		expect(gap.distance).toBeCloseTo(100);
		expect(gap.end.z).toBe(0);
	});
});

describe("formatMm", () => {
	it("shows whole millimetres, or one decimal when needed", () => {
		expect(formatMm(450)).toBe("450 mm");
		expect(formatMm(12.54)).toBe("12.5 mm");
	});
});

describe("stackDimensions", () => {
	const dim = (x0: number, x1: number, y = 0) => ({
		dimension: {
			start: vec3(x0, y, 0),
			end: vec3(x1, y, 0),
			distance: Math.abs(x1 - x0),
		},
		awayFrom: vec3((x0 + x1) / 2, 500, 0), // pieces on the +Y side, so lines step to -Y
	});

	it("keeps separate, non-overlapping dimensions on the first level", () => {
		expect(stackDimensions([dim(0, 400), dim(500, 900)])).toEqual([0, 0]);
	});

	it("puts the bigger of two overlapping dimensions further out", () => {
		expect(stackDimensions([dim(0, 1000), dim(200, 600)])).toEqual([1, 0]);
	});

	it("stacks as many levels as needed", () => {
		expect(stackDimensions([dim(0, 1200), dim(0, 800), dim(100, 400)])).toEqual(
			[2, 1, 0],
		);
	});

	it("doesn't stack dimensions that run in different directions", () => {
		const vertical = {
			dimension: {
				start: vec3(100, 0, 0),
				end: vec3(100, 0, 500),
				distance: 500,
			},
		};
		expect(stackDimensions([dim(0, 1000), vertical])).toEqual([0, 0]);
	});
});
