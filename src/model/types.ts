import type { Vec3 } from "@/geometry/vec";

export type Id = string;

/** Euler XYZ rotation in degrees (the piece's orientation; the box is centred on `position`). */
export type Rotation = Vec3;

/**
 * Where the rotate handles turn a piece: its centre, or the top, middle or bottom of either end
 * (the ends are the piece's local ±X sides: a rail's ends, a sheet's length ends; top/bottom is local ±Z).
 */
export type Pivot =
	| "centre"
	| "x-top"
	| "x-mid"
	| "x-bottom"
	| "x+top"
	| "x+mid"
	| "x+bottom";

type PieceBase = {
	id: Id;
	/** User-facing label, shown in the object list. Not part of cut-list identity. */
	name: string;
	/**
	 * The project stock this piece is cut from. The piece's fixed dimensions are a copy of the
	 * stock's size, kept in sync by the stock commands (the only code allowed to change them).
	 */
	stockId: Id;
	/** World position of the piece centre, in mm. */
	position: Vec3;
	rotation: Rotation;
	pivot: Pivot;
};

/** Board material. Length and width are editable; thickness comes from its stock. */
export type Sheet = PieceBase & {
	kind: "sheet";
	length: number;
	width: number;
	thickness: number;
};

/** Timber section. Length is editable; width and depth come from its stock. */
export type Framing = PieceBase & {
	kind: "framing";
	length: number;
	width: number;
	depth: number;
};

export type Piece = Sheet | Framing;

export type PieceKind = Piece["kind"];

/** Where a piece is and how it is turned. Tools preview these before committing. */
export type Transform = { position: Vec3; rotation: Rotation };
