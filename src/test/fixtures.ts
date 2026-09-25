import { createFraming, createSheet } from "@/model/createPiece";
import type { FramingStock, SheetStock } from "@/model/stock";
import type { Framing, Piece, Sheet } from "@/model/types";
import { type DocumentState, emptyDocument } from "@/state/document";

/** Test fixtures: small, predictable pieces resting on the floor at known positions. */

export const SHEET_18: SheetStock = {
	id: "sheet-18",
	kind: "sheet",
	thickness: 18,
};
export const RAIL_38x63: FramingStock = {
	id: "rail-38x63",
	kind: "framing",
	width: 38,
	depth: 63,
};
export const RAIL_45x90: FramingStock = {
	id: "rail-45x90",
	kind: "framing",
	width: 45,
	depth: 90,
};

/** A 1200 × 600 × 18 sheet lying flat with its min corner at the origin. */
export function sheet(over: Partial<Sheet> = {}): Sheet {
	return {
		...createSheet(SHEET_18, { length: 1200, width: 600 }),
		id: "sheet",
		name: "Sheet 1",
		position: { x: 600, y: 300, z: 9 },
		...over,
	};
}

/** A 1000 × 38 × 63 rail along X with its min corner at (0, 0, 0). */
export function rail(over: Partial<Framing> = {}): Framing {
	return {
		...createFraming(RAIL_38x63, 1000),
		id: "rail",
		name: "Framing 1",
		position: { x: 500, y: 19, z: 31.5 },
		...over,
	};
}

/** A document holding these pieces and the three test stock sizes. */
export function docWith(
	pieces: Piece[],
	extra: Partial<DocumentState> = {},
): DocumentState {
	return {
		...emptyDocument,
		stock: {
			[SHEET_18.id]: SHEET_18,
			[RAIL_38x63.id]: RAIL_38x63,
			[RAIL_45x90.id]: RAIL_45x90,
		},
		pieces: Object.fromEntries(pieces.map((p) => [p.id, p])),
		...extra,
	};
}

/** Unwraps a value the test expects to exist, failing clearly if it doesn't. */
export function defined<T>(value: T | null | undefined): T {
	if (value == null) throw new Error("expected a value, got none");
	return value;
}
