import { beforeEach, describe, expect, it } from "vitest";
import { commands } from "@/commands";
import { useAppStore } from "@/state/store";
import { docWith, rail } from "@/test/fixtures";
import {
	type MenuItem,
	menuItems,
	menuTargets,
	sameCut,
} from "@/tools/contextMenuSession";

const a = rail({ id: "a" });
const b = rail({ id: "b", position: { x: 500, y: 200, z: 31.5 } });
const c = rail({ id: "c", length: 600, position: { x: 300, y: 400, z: 31.5 } });

const run = (items: MenuItem[], label: string) => {
	const item = items.find(
		(i) => i !== "separator" && i.label.startsWith(label),
	);
	if (!item || item === "separator") throw new Error(`No "${label}" item`);
	item.run();
};

describe("context menu", () => {
	beforeEach(() => useAppStore.setState({ doc: docWith([a, b, c]) }));
	const doc = () => useAppStore.getState().doc;

	it("acts on the selection when the piece is in it, otherwise on the piece's object", () => {
		useAppStore.getState().apply(commands.selectPieces(["a", "c"]));
		expect(menuTargets(doc(), "a")).toEqual(["a", "c"]);
		expect(menuTargets(doc(), "b")).toEqual(["b"]);
	});

	it("finds every piece of the same cut", () => {
		expect(sameCut(doc(), "a")).toEqual(["a", "b"]);
	});

	it("groups the selection, then offers to ungroup", () => {
		useAppStore.getState().apply(commands.selectPieces(["a", "b"]));
		run(menuItems(doc(), "a"), "Group");
		expect(Object.values(doc().groups)[0].pieceIds).toEqual(["a", "b"]);
		const labels = menuItems(doc(), "b").map(
			(i) => i !== "separator" && i.label,
		);
		expect(labels).toContain("Ungroup");
	});

	it("duplicates in place, selecting the copy, and deletes the targets", () => {
		run(menuItems(doc(), "c"), "Duplicate");
		const copy = doc().selection[0];
		expect(copy).not.toBe("c");
		expect(doc().selection).toEqual([copy]);
		expect(doc().pieces[copy].position).toEqual(c.position);
		run(menuItems(doc(), copy), "Delete");
		expect(doc().pieces[copy]).toBeUndefined();
		expect(Object.keys(doc().pieces)).toHaveLength(3);
	});
});
