import { describe, expect, it } from "vitest";
import type { ScreenPoint } from "@/input/pointer";
import type { Group } from "@/model/group";
import { piecesInBox, type ScreenBox } from "@/tools/boxSelectTool";

/** A piece drawn as a square on screen, from (x, y) to (x + size, y + size). */
const square = (id: string, x: number, y: number, size = 10): ScreenBox => ({
	id,
	corners: [
		{ x, y },
		{ x: x + size, y },
		{ x: x + size, y: y + size },
		{ x, y: y + size },
	],
});

const pt = (x: number, y: number): ScreenPoint => ({ x, y });
const noGroups: Record<string, Group> = {};

describe("piecesInBox", () => {
	const boxes = [square("a", 0, 0), square("b", 50, 0), square("c", 200, 200)];

	it("picks anything the box touches, whichever way it's dragged", () => {
		expect(piecesInBox(boxes, noGroups, pt(-5, -5), pt(55, 20), false)).toEqual(
			["a", "b"],
		);
		expect(piecesInBox(boxes, noGroups, pt(55, 20), pt(-5, -5), false)).toEqual(
			["a", "b"],
		);
	});

	it("misses a slanted piece whose bounds it only clips", () => {
		// A diamond: its bounding box reaches (0, 0), but its outline doesn't.
		const diamond: ScreenBox = {
			id: "d",
			corners: [pt(10, 0), pt(20, 10), pt(10, 20), pt(0, 10)],
		};
		expect(
			piecesInBox([diamond], noGroups, pt(3, 3), pt(-5, -5), false),
		).toEqual([]);
		expect(
			piecesInBox([diamond], noGroups, pt(6, 6), pt(-5, -5), false),
		).toEqual(["d"]);
	});

	it("judges a piece partly behind the camera by the part in front", () => {
		const behind: ScreenBox = { id: "e", corners: [pt(1, 1), null] };
		expect(piecesInBox([behind], noGroups, pt(0, 0), pt(9, 9), false)).toEqual([
			"e",
		]);
	});

	describe("with a group", () => {
		const groups = { g: { id: "g", name: "Group 1", pieceIds: ["a", "b"] } };

		it("touching one piece takes the whole group", () => {
			expect(piecesInBox(boxes, groups, pt(20, 20), pt(-5, -5), false)).toEqual(
				["a", "b"],
			);
		});

		it("with Alt, takes just the pieces", () => {
			expect(piecesInBox(boxes, groups, pt(-5, -5), pt(20, 20), true)).toEqual([
				"a",
			]);
		});
	});
});
