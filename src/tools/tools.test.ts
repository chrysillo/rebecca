import { beforeEach, describe, expect, it } from "vitest";
import { vec3 } from "@/geometry/vec";
import { snapTargets } from "@/snapping/targets";
import { emptyHistory } from "@/state/history";
import { useAppStore } from "@/state/store";
import { docWith, rail, sheet } from "@/test/fixtures";
import { typedSize } from "@/tools/creatorSession";
import {
	confirmExtrude,
	handleExtrudeKey,
	startExtrude,
} from "@/tools/extrudeSession";
import { facesNearestPointer } from "@/tools/extrudeTool";
import { confirmJoin, openJoiner } from "@/tools/joinSession";
import { computeMove, computePlaneMove } from "@/tools/moveTool";
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

describe("join wheel", () => {
	// A board and a rail pressed 9 mm into it, both selected.
	const board = sheet({ id: "board" });
	const housed = rail({ id: "housed", position: vec3(600, 300, 40.5) });

	beforeEach(() => {
		useAppStore.setState({
			doc: { ...docWith([board, housed]), selection: ["board", "housed"] },
			history: emptyHistory,
			joiner: null,
		});
	});

	it("preselects the larger piece and cuts it in one undo step", () => {
		openJoiner({ x: 0, y: 0 });
		expect(useAppStore.getState().joiner?.highlighted).toBe("board");
		confirmJoin();
		const { doc, history, joiner } = useAppStore.getState();
		expect(joiner).toBeNull();
		expect(Object.values(doc.joints)).toMatchObject([
			{ target: "board", tool: "housed" },
		]);
		expect(history.past).toHaveLength(1);
	});

	it("won't open when the selected pieces only touch", () => {
		const onTop = rail({ id: "housed", position: vec3(600, 300, 49.5) });
		useAppStore.setState({
			doc: { ...docWith([board, onTop]), selection: ["board", "housed"] },
		});
		openJoiner({ x: 0, y: 0 });
		expect(useAppStore.getState().joiner).toBeNull();
	});
});

describe("computePlaneMove", () => {
	it("steps each in-plane axis and snaps them independently", () => {
		const targets = snapTargets([a, b], new Set(["b"]));
		const moved = computePlaneMove({
			pieces: [b],
			targets,
			travel: { x: 97.4, y: 43 },
			fine: false,
			tolerance: 10,
		});
		// X just steps (nothing in range); Y snaps b's side against a's far side (38 + 19).
		expect(moved.transforms.b.position).toEqual({ x: 1700, y: 57, z: 31.5 });
		expect(moved.snapTarget).not.toBeNull();
	});
});

describe("facesNearestPointer", () => {
	const face = (axis: "x" | "y", sign: 1 | -1) => ({
		pieceId: "sheet",
		axis,
		sign,
	});

	it("orders faces by on-screen distance, off-screen ones last", () => {
		const ranked = facesNearestPointer(
			[
				{ face: face("x", -1), at: null },
				{ face: face("x", 1), at: { x: 300, y: 100 } },
				{ face: face("y", 1), at: { x: 110, y: 100 } },
				{ face: face("y", -1), at: null },
			],
			{ x: 100, y: 100 },
		);
		expect(ranked).toEqual([
			face("y", 1),
			face("x", 1),
			face("x", -1),
			face("y", -1),
		]);
	});
});

describe("extruding a whole piece (E with no face selected)", () => {
	const key = (k: string, shiftKey = false) =>
		handleExtrudeKey({
			key: k,
			shiftKey,
			ctrlKey: false,
			metaKey: false,
			altKey: false,
		});

	beforeEach(() => {
		useAppStore.setState({
			doc: { ...docWith([sheet()]), selection: ["sheet"] },
			history: emptyHistory,
			extrude: null,
		});
	});

	it("moves one of the sheet's edges, and Tab steps round the others", () => {
		startExtrude();
		const first = useAppStore.getState().extrude;
		expect(first?.faces).toHaveLength(1);
		expect(first?.choices).toHaveLength(4);
		expect(first?.choices.flat().every((f) => f.axis !== "z")).toBe(true);

		const facesNow = () => useAppStore.getState().extrude?.faces;
		expect(key("Tab")).toBe(true);
		expect(facesNow()).toEqual(first?.choices[1]);
		key("Tab", true);
		key("Tab", true);
		expect(facesNow()).toEqual(first?.choices[3]);
	});

	it("moves every selected piece's face in the same plane together", () => {
		const other = rail({ id: "other", position: { x: 500, y: 219, z: 31.5 } });
		useAppStore.setState({
			doc: { ...docWith([rail(), other]), selection: ["rail", "other"] },
		});
		startExtrude();
		const { extrude } = useAppStore.getState();
		// Two rails side by side: their near ends share a plane, as do their far ends.
		expect(extrude?.choices).toHaveLength(2);
		expect(extrude?.faces.map((f) => f.pieceId).sort()).toEqual([
			"other",
			"rail",
		]);
		key("2");
		key("0");
		confirmExtrude();
		const { doc } = useAppStore.getState();
		expect(doc.pieces.rail.length).toBe(1020);
		expect(doc.pieces.other.length).toBe(1020);
	});

	it("resizes the piece in one undo step and keeps it selected", () => {
		startExtrude();
		key("5");
		key("0");
		confirmExtrude();
		const { doc, history } = useAppStore.getState();
		const s = doc.pieces.sheet;
		expect(s.kind === "sheet" && s.length + s.width).toBe(1850);
		expect(doc.selection).toEqual(["sheet"]);
		expect(history.past).toHaveLength(1);
	});

	it("explains, rather than starting, when nothing is selected", () => {
		useAppStore.setState({
			doc: { ...docWith([sheet()]), selectedFaces: [], selection: [] },
		});
		expect(startExtrude()).toBe(false);
		expect(key("Tab")).toBe(false);
	});
});
