import { describe, expect, it } from "vitest";
import { cutListKey } from "@/model/cutListKey";
import { defaultName } from "@/model/naming";
import { findStock, orderedStock, type Stock } from "@/model/stock";
import { rail, sheet } from "@/test/fixtures";

describe("cutListKey", () => {
	it("treats the same cut as identical whichever way round it was drawn", () => {
		expect(cutListKey(sheet({ length: 800, width: 400 }))).toBe(
			cutListKey(sheet({ length: 400, width: 800 })),
		);
	});

	it("ignores position, rotation and name", () => {
		const moved = rail({
			name: "Leg",
			position: { x: 9, y: 9, z: 99 },
			rotation: { x: 0, y: 0, z: 45 },
		});
		expect(cutListKey(moved)).toBe(cutListKey(rail()));
	});

	it("separates different lengths and sections", () => {
		expect(cutListKey(rail({ length: 850 }))).not.toBe(cutListKey(rail()));
		expect(cutListKey(rail({ width: 45, depth: 90 }))).not.toBe(
			cutListKey(rail()),
		);
	});
});

describe("defaultName", () => {
	it("continues after the highest number, never reusing one", () => {
		const pieces = [
			sheet({ name: "Sheet 1" }),
			sheet({ id: "s3", name: "Sheet 3" }),
			rail({ name: "Leg" }),
		];
		expect(defaultName(pieces, "sheet")).toBe("Sheet 4");
		expect(defaultName(pieces, "framing")).toBe("Framing 1");
	});
});

describe("stock lookups", () => {
	const stock: Record<string, Stock> = {
		f: { id: "f", kind: "framing", width: 38, depth: 63 },
		s: { id: "s", kind: "sheet", thickness: 18 },
	};

	it("finds an entry by exact size and kind", () => {
		expect(findStock(stock, "framing", { width: 38, depth: 63 })?.id).toBe("f");
		expect(
			findStock(stock, "framing", { width: 38, depth: 64 }),
		).toBeUndefined();
	});

	it("lists sheets before framing", () => {
		expect(orderedStock(stock).map((s) => s.id)).toEqual(["s", "f"]);
	});
});
