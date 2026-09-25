import { describe, expect, it } from "vitest";
import { commands } from "@/commands";
import { cutList, cutListText } from "@/model/cutList";
import { docWith, rail, sheet } from "@/test/fixtures";

describe("cut list", () => {
	it("counts identical pieces together, ignoring joints", () => {
		// Rail b crosses rail a and is cut into it: a keeps its full 1000 mm length.
		const a = rail({ id: "a", name: "Rail A" });
		const b = rail({
			id: "b",
			name: "Rail B",
			position: { x: 500, y: 19, z: 31.5 },
			rotation: { x: 0, y: 0, z: 90 },
		});
		const doc = commands.joinInto("a", ["b"])(docWith([a, b, sheet()]));
		expect(Object.keys(doc.joints)).toHaveLength(1);
		const rows = cutList(Object.values(doc.pieces));
		expect(
			rows.map((r) => [r.kind, r.stock, r.length, r.width, r.quantity]),
		).toEqual([
			["framing", "38x63", 1000, null, 2],
			["sheet", "18", 1200, 600, 1],
		]);
	});

	it("writes grouped text with a section per kind + stock size", () => {
		const doc = docWith([rail(), rail({ id: "b" }), sheet()]);
		const text = cutListText(cutList(Object.values(doc.pieces)));
		expect(text).toBe(
			"Framing\n38x63mm\n2x 1000mm\n\nSheets\n18mm\n1x 1200x600mm",
		);
	});
});
