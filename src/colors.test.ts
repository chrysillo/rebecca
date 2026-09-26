import { Color } from "three";
import { describe, expect, it } from "vitest";
import { stockColor, WOOD_COLOR } from "@/colors";
import { RAIL_38x63, SHEET_18 } from "@/test/fixtures";

describe("stockColor", () => {
	const osb = { ...SHEET_18, material: "OSB" };
	const mdf = { ...SHEET_18, material: "MDF" };

	it("colours plywood and OSB differently, and timber by its kind", () => {
		expect(stockColor(SHEET_18)).toBe(WOOD_COLOR.sheet);
		expect(stockColor(osb)).not.toBe(stockColor(SHEET_18));
		expect(stockColor(RAIL_38x63)).toBe(WOOD_COLOR.framing);
	});

	it("gives any other material a stable colour three.js can read", () => {
		expect(stockColor(mdf)).toBe(stockColor({ ...mdf, id: "other" }));
		expect(stockColor(mdf)).not.toBe(stockColor(osb));
		expect(new Color(stockColor(mdf)).getHexString()).not.toBe("ffffff");
	});
});
