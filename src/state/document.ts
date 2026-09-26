import type { FaceRef } from "@/geometry/box";
import { newId } from "@/model/createPiece";
import type { Group } from "@/model/group";
import type { Joint } from "@/model/joint";
import type { Measurement } from "@/model/measurement";
import type { Stock } from "@/model/stock";
import type { Id, Piece, Pivot } from "@/model/types";

/**
 * Everything that is saved and undoable.
 * Selection lives here so that selecting counts as an undo step.
 */
export type DocumentState = {
	pieces: Record<Id, Piece>;
	/** The project's sheet thicknesses and framing sections. */
	stock: Record<Id, Stock>;
	/** Saved dimension lines between faces. */
	measurements: Record<Id, Measurement>;
	/** Cuts: one piece's box subtracted from another. */
	joints: Record<Id, Joint>;
	/** Pieces picked and moved together as one object. */
	groups: Record<Id, Group>;
	/** Selected pieces, in the order they were added. */
	selection: Id[];
	/** Pivot used when several pieces are selected (a single piece uses its own). Resets when the selection changes. */
	groupPivot: Pivot;
	/**
	 * Selected faces, in the order they were clicked (the last one drives an extrude).
	 * Selecting faces clears the piece selection and vice versa, so at most one of the two is non-empty.
	 */
	selectedFaces: FaceRef[];
};

/** A new project starts with one common size of each kind. */
function starterStock(): Record<Id, Stock> {
	const sheet: Stock = {
		id: newId(),
		kind: "sheet",
		material: "Plywood",
		thickness: 18,
	};
	const framing: Stock = { id: newId(), kind: "framing", width: 38, depth: 63 };
	return { [sheet.id]: sheet, [framing.id]: framing };
}

/** A fresh project: no pieces, the starter stock (with its own new ids). */
export function newDocument(): DocumentState {
	return {
		pieces: {},
		stock: starterStock(),
		measurements: {},
		joints: {},
		groups: {},
		selection: [],
		groupPivot: "centre",
		selectedFaces: [],
	};
}

export const emptyDocument: DocumentState = newDocument();

const FILE_VERSION = 1;

/** What a project's JSON file holds: the model only. Selection is session state and isn't saved. */
export type ProjectFile = {
	version: number;
	pieces: Record<Id, Piece>;
	stock: Record<Id, Stock>;
	measurements: Record<Id, Measurement>;
	joints: Record<Id, Joint>;
	groups: Record<Id, Group>;
};

export const toProjectFile = (doc: DocumentState): ProjectFile => ({
	version: FILE_VERSION,
	pieces: doc.pieces,
	stock: doc.stock,
	measurements: doc.measurements,
	joints: doc.joints,
	groups: doc.groups,
});

/** The collections every project file must have. */
const FILE_COLLECTIONS = [
	"pieces",
	"stock",
	"measurements",
	"joints",
	"groups",
] as const;

/** Reads a saved project. Throws on a file it can't read, including one missing a collection. */
export function fromProjectFile(json: unknown): DocumentState {
	if (typeof json !== "object" || json === null)
		throw new Error("Not a project file");
	const file = json as Partial<ProjectFile>;
	if (file.version !== FILE_VERSION)
		throw new Error(`Unsupported project version: ${String(file.version)}`);
	const missing = FILE_COLLECTIONS.filter(
		(key) => typeof file[key] !== "object" || file[key] === null,
	);
	if (missing.length > 0)
		throw new Error(`Project file is missing ${missing.join(", ")}`);
	const { pieces, stock, measurements, joints, groups } = file as ProjectFile;
	return {
		pieces,
		stock,
		measurements,
		joints,
		groups,
		selection: [],
		groupPivot: "centre",
		selectedFaces: [],
	};
}

/** A document change: a pure function returning a new document, or the same one when nothing changed. */
export type Command = (doc: DocumentState) => DocumentState;
