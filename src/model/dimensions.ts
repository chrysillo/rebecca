import type { Axis, Vec3 } from "@/geometry/vec";
import type { Framing, Piece, PieceKind, Sheet } from "@/model/types";

type SheetDimension = "length" | "width" | "thickness";
type FramingDimension = "length" | "width" | "depth";

/** Dimensions that may change after creation. Everything else is fixed. */
export const EDITABLE_DIMENSIONS = {
	sheet: ["length", "width"],
	framing: ["length"],
} as const satisfies {
	sheet: readonly SheetDimension[];
	framing: readonly FramingDimension[];
};

export type EditableDimension = (typeof EDITABLE_DIMENSIONS)[PieceKind][number];

export const isEditableDimension = (
	kind: PieceKind,
	key: string,
): key is EditableDimension =>
	(EDITABLE_DIMENSIONS[kind] as readonly string[]).includes(key);

/** Which dimension each local box axis measures (the same mapping `pieceSize` uses). */
const AXIS_DIMENSION = {
	sheet: { x: "length", y: "width", z: "thickness" },
	framing: { x: "length", y: "width", z: "depth" },
} as const satisfies {
	sheet: Record<Axis, SheetDimension>;
	framing: Record<Axis, FramingDimension>;
};

/** The dimension a local axis measures, e.g. a sheet's local Z is its thickness. */
export const dimensionAlong = (
	kind: PieceKind,
	axis: Axis,
): SheetDimension | FramingDimension => AXIS_DIMENSION[kind][axis];

/**
 * Size of the piece's box along its local X, Y, Z axes.
 * Sheets lie flat (thickness on Z); framing runs along X.
 * Rendering, snapping and floor clamping all rely on this one mapping.
 */
export function pieceSize(piece: Piece): Vec3 {
	switch (piece.kind) {
		case "sheet":
			return sheetSize(piece);
		case "framing":
			return framingSize(piece);
	}
}

const sheetSize = (s: Sheet): Vec3 => ({
	x: s.length,
	y: s.width,
	z: s.thickness,
});

const framingSize = (f: Framing): Vec3 => ({
	x: f.length,
	y: f.width,
	z: f.depth,
});

export type DimensionEntry =
	| { key: EditableDimension; value: number; editable: true }
	| { key: string; value: number; editable: false };

/** The piece's dimensions in display order, flagged editable or fixed. */
export function dimensionEntries(piece: Piece): DimensionEntry[] {
	switch (piece.kind) {
		case "sheet":
			return [
				{ key: "length", value: piece.length, editable: true },
				{ key: "width", value: piece.width, editable: true },
				{ key: "thickness", value: piece.thickness, editable: false },
			];
		case "framing":
			return [
				{ key: "length", value: piece.length, editable: true },
				{ key: "width", value: piece.width, editable: false },
				{ key: "depth", value: piece.depth, editable: false },
			];
	}
}
