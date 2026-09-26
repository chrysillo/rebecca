import { describe, expect, it } from "vitest";
import { commands } from "@/commands";
import { cutList, cutListText } from "@/model/cutList";
import type { SheetStock } from "@/model/stock";
import { docWith, rail, SHEET_18, sheet } from "@/test/fixtures";

const OSB_18: SheetStock = { ...SHEET_18, id: "osb-18", material: "OSB" };

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
		const rows = cutList(Object.values(doc.pieces), doc.stock);
		expect(
			rows.map((r) => [
				r.kind,
				r.stock,
				r.material,
				r.length,
				r.width,
				r.quantity,
			]),
		).toEqual([
			["framing", "38x63", null, 1000, null, 2],
			["sheet", "18", "Plywood", 1200, 600, 1],
		]);
	});

	it("writes grouped text with a section per kind + stock size", () => {
		const doc = docWith([rail(), rail({ id: "b" }), sheet()]);
		const text = cutListText(cutList(Object.values(doc.pieces), doc.stock));
		expect(text).toBe(
			"Framing\n38x63mm\n2x 1000mm\n\nSheets\n18mm Plywood\n1x 1200x600mm",
		);
	});

	it("keeps same-thickness sheets of different materials apart", () => {
		const doc = docWith([sheet(), sheet({ id: "o", stockId: OSB_18.id })]);
		const stock = { ...doc.stock, [OSB_18.id]: OSB_18 };
		const text = cutListText(cutList(Object.values(doc.pieces), stock));
		expect(text).toBe(
			"Sheets\n18mm OSB\n1x 1200x600mm\n\nSheets\n18mm Plywood\n1x 1200x600mm",
		);
	});
});
