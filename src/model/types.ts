import type { Vec3 } from "../geometry/vec";

export type Id = string;

/** Euler XYZ rotation in degrees, applied about the piece centre. */
export type Rotation = Vec3;

type PieceBase = {
	id: Id;
	/** User-facing label, shown in the object list. Not part of cut-list identity. */
	name: string;
	/** World position of the piece centre, in mm. */
	position: Vec3;
	rotation: Rotation;
};

/** Board material. Length and width are editable; thickness is fixed once created. */
export type Sheet = PieceBase & {
	kind: "sheet";
	length: number;
	width: number;
	thickness: number;
};

/** Timber section. Length is editable; width and depth are fixed once created. */
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
