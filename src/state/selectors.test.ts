import { describe, expect, it } from "vitest";
import { displayPieces } from "@/state/selectors";
import { docWith, rail, sheet } from "@/test/fixtures";

describe("displayPieces", () => {
	const board = sheet({ id: "board" });
	const housed = rail({ id: "housed", position: { x: 600, y: 300, z: 40.5 } });
	const doc = {
		...docWith([board, housed]),
		joints: { j: { id: "j", target: "board", tool: "housed" } },
	};

	it("hands each cut piece its tools, as currently shown", () => {
		const moved = { x: 600, y: 300, z: 45 };
		const drag = {
			preview: { housed: { position: moved, rotation: housed.rotation } },
			duplicate: false,
		} as unknown as Parameters<typeof displayPieces>[1];
		const shown = displayPieces(doc, drag, null);
		const cut = shown.find((d) => d.piece.id === "board");
		expect(cut?.cutters.map((p) => p.position)).toEqual([moved]);
		expect(shown.find((d) => d.piece.id === "housed")?.cutters).toEqual([]);
	});
});
