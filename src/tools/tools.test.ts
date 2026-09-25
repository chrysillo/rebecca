import { describe, expect, it } from "vitest";
import { vec3 } from "@/geometry/vec";
import { snapTargets } from "@/snapping/targets";
import { rail } from "@/test/fixtures";
import { typedSize } from "@/tools/creatorSession";
import { computeMove } from "@/tools/moveTool";
import { computeRotation } from "@/tools/rotateTool";

const a = rail({ id: "a" });
const b = rail({ id: "b", position: vec3(1600, 19, 31.5) });

describe("computeMove", () => {
	const base = {
		pieces: [b],
		targets: [],
		axis: "x" as const,
		fine: false,
		tolerance: 0,
	};

	it("moves in 10 mm steps when nothing is in snap range", () => {
		expect(
			computeMove({ ...base, distance: 97.4 }).transforms.b.position.x,
		).toBe(1700);
	});

	it("moves in exact 1 mm steps with the fine modifier, ignoring snaps", () => {
		const targets = snapTargets([a, b], new Set(["b"]));
		const moved = computeMove({
			...base,
			targets,
			distance: -97.4,
			fine: true,
			tolerance: 10,
		});
		expect(moved.transforms.b.position.x).toBe(1503);
		expect(moved.snapTarget).toBeNull();
	});

	it("prefers a snap over the step", () => {
		const targets = snapTargets([a, b], new Set(["b"]));
		const moved = computeMove({
			...base,
			targets,
			distance: -97,
			tolerance: 10,
		});
		expect(moved.transforms.b.position.x).toBeCloseTo(1500); // flush against A's end at x = 1000
		expect(moved.snapTarget?.face?.pieceId).toBe("a");
	});

	it("won't push a piece through the floor", () => {
		const moved = computeMove({ ...base, axis: "z", distance: -500 });
		expect(moved.transforms.b.position.z).toBe(31.5);
	});
});

describe("computeRotation", () => {
	const r = rail();
	const turn = (degrees: number, fine = false, pivot = r.position) =>
		computeRotation({ pieces: [r], axis: "z", pivot, degrees, fine });

	it("rotates in 45° steps, or 5° with the fine modifier", () => {
		expect(turn(50).degrees).toBe(45);
		expect(turn(52, true).degrees).toBe(50);
	});

	it("turns around the pivot, carrying the piece with it", () => {
		const aroundStart = turn(90, false, vec3(0, 19, 31.5)); // pivot at the rail's start
		const t = aroundStart.transforms.rail;
		expect(t.rotation.z).toBe(90);
		expect(t.position.x).toBeCloseTo(0);
		expect(t.position.y).toBeCloseTo(519);
	});
});

describe("typedSize (create wheel)", () => {
	it("reads a sheet thickness", () => {
		expect(typedSize("sheet", "12")).toEqual({ thickness: 12 });
	});

	it("reads a framing section in several spellings", () => {
		expect(typedSize("framing", "45x90")).toEqual({ width: 45, depth: 90 });
		expect(typedSize("framing", "45 × 90")).toEqual({ width: 45, depth: 90 });
		expect(typedSize("framing", "45")).toEqual({ width: 45, depth: 45 });
	});

	it("rejects nonsense and non-positive sizes", () => {
		expect(typedSize("sheet", "")).toBeNull();
		expect(typedSize("sheet", "0")).toBeNull();
		expect(typedSize("framing", "45x.")).toBeNull();
	});
});
