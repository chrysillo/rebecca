import { describe, expect, it } from "vitest";
import { commands } from "@/commands";
import { cutListKey } from "@/model/cutListKey";
import {
	defaultGroupName,
	expandToGroups,
	type Group,
	groupsWithin,
	pruneGroups,
} from "@/model/group";
import { defaultName } from "@/model/naming";
import {
	findStock,
	identicalRuns,
	orderedStock,
	type Stock,
	sizeMatches,
	stockSections,
} from "@/model/stock";
import { docWith, rail, sheet } from "@/test/fixtures";

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
		expect(defaultName(pieces, "framing")).toBe("Timber 1");
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

	it("matches only the size values given", () => {
		expect(sizeMatches(stock.f, { width: 38 })).toBe(true);
		expect(sizeMatches(stock.f, { width: 38, depth: 90 })).toBe(false);
		expect(sizeMatches(stock.s, { thickness: 18 })).toBe(true);
	});

	it("lists sheets before framing", () => {
		expect(orderedStock(stock).map((s) => s.id)).toEqual(["s", "f"]);
	});
});

describe("identicalRuns", () => {
	it("stacks pieces of the same stock and length, whatever their names or joints", () => {
		const a = rail({ id: "a", name: "Rail A" });
		const b = rail({
			id: "b",
			name: "Rail B",
			position: { x: 500, y: 19, z: 31.5 },
			rotation: { x: 0, y: 0, z: 90 },
		});
		const c = rail({ id: "c", name: "Short", length: 600 });
		const doc = commands.joinInto("a", ["b"])(docWith([a, b, c]));
		expect(Object.keys(doc.joints)).toHaveLength(1);
		const [section] = stockSections(Object.values(doc.pieces), doc.stock);
		expect(
			identicalRuns(section.pieces).map((run) => run.map((p) => p.id)),
		).toEqual([["a", "b"], ["c"]]);
	});

	it("stacks a sheet drawn either way round", () => {
		const pieces = [
			sheet({ id: "a", length: 800, width: 400 }),
			sheet({ id: "b", length: 600, width: 300 }),
			sheet({ id: "c", length: 400, width: 800 }),
		];
		const [section] = stockSections(pieces, docWith(pieces).stock);
		expect(
			identicalRuns(section.pieces).map((run) => run.map((p) => p.id)),
		).toEqual([["a", "c"], ["b"]]);
	});
});

describe("groups", () => {
	const groups: Record<string, Group> = {
		g: { id: "g", name: "Group 2", pieceIds: ["a", "b"] },
	};

	it("expands ids to whole groups, in order, without repeats", () => {
		expect(expandToGroups(groups, ["c", "b", "a"])).toEqual(["c", "a", "b"]);
	});

	it("finds groups wholly inside a set of ids", () => {
		expect(groupsWithin(groups, ["a"])).toEqual([]);
		expect(groupsWithin(groups, ["a", "b", "c"]).map((g) => g.id)).toEqual([
			"g",
		]);
	});

	it("names the next group after the highest number", () => {
		expect(defaultGroupName(groups)).toBe("Group 3");
	});

	it("drops missing pieces and groups left with fewer than two", () => {
		expect(pruneGroups(groups, () => true)).toBe(groups);
		expect(pruneGroups(groups, (id) => id !== "b")).toEqual({});
	});
});
