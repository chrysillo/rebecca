import { beforeEach, describe, expect, it } from "vitest";
import { pieceAabb } from "@/geometry/box";
import type { FramingStock } from "@/model/stock";
import { emptyHistory } from "@/state/history";
import { useAppStore } from "@/state/store";
import { docWith, RAIL_45x90, rail, sheet } from "@/test/fixtures";
import { commands } from ".";

const face = (pieceId: string) => ({
	pieceId,
	axis: "x" as const,
	sign: 1 as const,
});

describe("selection", () => {
	const doc = docWith([rail({ id: "a" }), rail({ id: "b" })]);

	it("Shift-toggles pieces in and out", () => {
		const both = commands.togglePiece("b")(commands.selectPieces(["a"])(doc));
		expect(both.selection).toEqual(["a", "b"]);
		expect(commands.togglePiece("a")(both).selection).toEqual(["b"]);
	});

	it("keeps pieces and faces mutually exclusive", () => {
		const pieces = commands.selectPieces(["a"])(doc);
		const faces = commands.toggleFace(face("b"))(pieces);
		expect(faces.selection).toEqual([]);
		expect(faces.selectedFaces).toEqual([face("b")]);
		expect(commands.selectPieces(["a"])(faces).selectedFaces).toEqual([]);
	});

	it("resets the group pivot when the selection changes", () => {
		const group = commands.setGroupPivot("x+top")(
			commands.selectPieces(["a", "b"])(doc),
		);
		expect(group.groupPivot).toBe("x+top");
		expect(commands.selectPieces(["a"])(group).groupPivot).toBe("centre");
	});

	it("returns the same document when nothing changes (so no empty undo steps)", () => {
		const selected = commands.selectPieces(["a"])(doc);
		expect(commands.selectPieces(["a"])(selected)).toBe(selected);
	});
});

describe("undo history", () => {
	beforeEach(() => {
		useAppStore.setState({
			doc: docWith([rail()]),
			history: emptyHistory,
			drag: null,
			extrude: null,
		});
	});

	it("counts selection as its own undo step, before a move", () => {
		const { apply, undo } = useAppStore.getState();
		apply(commands.selectPieces(["rail"]));
		apply(
			commands.setTransforms({
				rail: {
					position: { x: 800, y: 19, z: 31.5 },
					rotation: { x: 0, y: 0, z: 0 },
				},
			}),
		);

		undo();
		const afterFirstUndo = useAppStore.getState().doc;
		expect(afterFirstUndo.pieces.rail.position.x).toBe(500);
		expect(afterFirstUndo.selection).toEqual(["rail"]); // still selected

		undo();
		expect(useAppStore.getState().doc.selection).toEqual([]);
	});

	it("redoes what was undone", () => {
		const { apply, undo, redo } = useAppStore.getState();
		apply(commands.setDimension("rail", "length", 800));
		undo();
		redo();
		const r = useAppStore.getState().doc.pieces.rail;
		expect(r.kind === "framing" && r.length).toBe(800);
	});
});

describe("pieces", () => {
	it("refuses to change a fixed dimension", () => {
		const doc = docWith([rail()]);
		expect(commands.setDimension("rail", "width", 50)(doc)).toBe(doc);
	});

	it("duplicates to new positions, selecting the copies and leaving the originals", () => {
		const doc = docWith([rail()]);
		const next = commands.duplicatePiecesTo({
			rail: {
				position: { x: 500, y: 200, z: 31.5 },
				rotation: { x: 0, y: 0, z: 0 },
			},
		})(doc);
		expect(Object.keys(next.pieces)).toHaveLength(2);
		expect(next.pieces.rail.position.y).toBe(19);
		expect(next.pieces[next.selection[0]].position.y).toBe(200);
	});

	it("drops selected faces of deleted pieces", () => {
		const doc = docWith([rail(), sheet()], {
			selectedFaces: [face("rail"), face("sheet")],
		});
		expect(commands.deletePieces(["rail"])(doc).selectedFaces).toEqual([
			face("sheet"),
		]);
	});

	it("extrudes several faces as one change", () => {
		const doc = docWith([rail()]);
		const next = commands.extrudeFaces(
			[face("rail"), { pieceId: "rail", axis: "x", sign: -1 }],
			25,
		)(doc);
		const r = next.pieces.rail;
		expect(r.kind === "framing" && r.length).toBe(1050);
	});
});

describe("stock", () => {
	it("resizes every piece cut from a stock entry when it changes", () => {
		const doc = docWith([
			sheet({ id: "s1" }),
			sheet({ id: "s2", position: { x: 2000, y: 300, z: 9 } }),
		]);
		const next = commands.updateStock("sheet-18", { thickness: 19 })(doc);
		for (const id of ["s1", "s2"]) {
			const s = next.pieces[id];
			expect(s.kind === "sheet" && s.thickness).toBe(19);
			expect(pieceAabb(s).min.z).toBeCloseTo(0); // grew upward, still on the floor
		}
	});

	it("refuses to remove a size that's still in use", () => {
		const doc = docWith([rail()]);
		expect(commands.removeStock("rail-38x63")(doc)).toBe(doc);
		expect(
			commands.removeStock("rail-45x90")(doc).stock["rail-45x90"],
		).toBeUndefined();
	});

	it("moves a piece onto another size of the same kind", () => {
		const doc = docWith([rail()]);
		const next = commands.setPieceStock("rail", RAIL_45x90.id)(doc).pieces.rail;
		expect(next.stockId).toBe(RAIL_45x90.id);
		expect(next.kind === "framing" && [next.width, next.depth]).toEqual([
			45, 90,
		]);
		expect(commands.setPieceStock("rail", "sheet-18")(doc)).toBe(doc); // wrong kind
	});

	it("adds a new size and a piece cut from it in one step", () => {
		const doc = docWith([]);
		const fresh: FramingStock = {
			id: "new",
			kind: "framing",
			width: 70,
			depth: 70,
		};
		const next = commands.addPieceFromStock(fresh)(doc);
		expect(next.stock.new).toEqual(fresh);
		const [piece] = Object.values(next.pieces);
		expect(piece.stockId).toBe("new");
		expect(next.selection).toEqual([piece.id]);
	});
});

describe("measurements", () => {
	// Top edge across a rail's end / start (runs along Y).
	const xEnd = (pieceId: string) => ({
		pieceId,
		axis: "y" as const,
		u: 1 as const,
		v: 1 as const,
	});
	const xStart = (pieceId: string) => ({
		pieceId,
		axis: "y" as const,
		u: -1 as const,
		v: 1 as const,
	});

	it("adds and removes a measurement", () => {
		const doc = docWith([rail({ id: "a" }), rail({ id: "b" })]);
		const added = commands.addMeasurement(xEnd("a"), xStart("b"))(doc);
		const [m] = Object.values(added.measurements);
		expect(m.from).toEqual(xEnd("a"));
		expect(
			Object.keys(commands.removeMeasurement(m.id)(added).measurements),
		).toHaveLength(0);
	});

	it("ignores measuring an edge against itself", () => {
		const doc = docWith([rail({ id: "a" })]);
		expect(commands.addMeasurement(xEnd("a"), xEnd("a"))(doc)).toBe(doc);
	});

	it("drops measurements when a piece they use is deleted", () => {
		const doc = commands.addMeasurement(
			xEnd("a"),
			xStart("b"),
		)(docWith([rail({ id: "a" }), rail({ id: "b" })]));
		expect(
			Object.keys(commands.deletePieces(["b"])(doc).measurements),
		).toHaveLength(0);
	});
});

describe("measure tool (chaining)", () => {
	const edge = (pieceId: string, u: 1 | -1) => ({
		pieceId,
		axis: "y" as const,
		u,
		v: 1 as const,
	});

	beforeEach(() => {
		useAppStore.setState({
			doc: docWith([rail({ id: "a" }), rail({ id: "b" })]),
			history: emptyHistory,
			measureStart: null,
		});
	});

	it("measures between consecutive clicks and chains on from the last edge", async () => {
		const { measureClick, cancelMeasure } = await import(
			"@/tools/measureSession"
		);
		measureClick(edge("a", -1));
		measureClick(edge("a", 1));
		measureClick(edge("b", 1));
		const all = Object.values(useAppStore.getState().doc.measurements);
		expect(
			all.map((m) => [m.from.pieceId, m.from.u, m.to.pieceId, m.to.u]),
		).toEqual([
			["a", -1, "a", 1],
			["a", 1, "b", 1],
		]);
		expect(cancelMeasure()).toBe(true);
		expect(useAppStore.getState().measureStart).toBeNull();
	});
});
