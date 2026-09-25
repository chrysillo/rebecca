import { piecesAabb } from "../geometry/box";
import { extrudePiece } from "../geometry/extrude";
import { add, scale, type Vec3 } from "../geometry/vec";
import type { Id, Piece } from "../model/types";
import type { DocumentState } from "./document";
import type { DragState } from "./drag";
import { type ExtrudeState, effectiveDistance } from "./extrude";

export const selectedPieces = (doc: DocumentState): Piece[] =>
	doc.selection.flatMap((id) => doc.pieces[id] ?? []);

/** The selected pieces as currently shown, i.e. with any drag preview applied. */
export const selectedPiecesPreviewed = (
	doc: DocumentState,
	drag: DragState | null,
): Piece[] =>
	selectedPieces(doc).map((p) => {
		const preview = drag?.preview[p.id];
		return preview ? { ...p, ...preview } : p;
	});

/** Centre of the bounding box around some pieces. */
export function centreOf(pieces: Piece[]): Vec3 {
	const box = piecesAabb(pieces);
	return scale(add(box.min, box.max), 0.5);
}

/** The piece being extruded, as it would be if the extrude were confirmed now. */
export function extrudePreview(
	doc: DocumentState,
	extrude: ExtrudeState | null,
): Piece | null {
	const piece = extrude ? doc.pieces[extrude.face.pieceId] : undefined;
	if (!extrude || !piece) return null;
	return extrudePiece(piece, extrude.face, effectiveDistance(extrude));
}

/** A piece as currently shown: its extrude preview if it's being extruded, else the document version. */
export function shownPiece(
	doc: DocumentState,
	extrude: ExtrudeState | null,
	id: Id,
): Piece | undefined {
	const preview = extrudePreview(doc, extrude);
	return preview?.id === id ? preview : doc.pieces[id];
}

export type DisplayPiece = { piece: Piece; selected: boolean; ghost: boolean };

/**
 * What the scene should draw: the document with any drag or extrude preview applied.
 * During a duplicate-drag the originals stay put and ghost copies follow the pointer.
 */
export function displayPieces(
	doc: DocumentState,
	drag: DragState | null,
	extrude: ExtrudeState | null,
): DisplayPiece[] {
	const selected = new Set(doc.selection);
	const extruded = extrudePreview(doc, extrude);
	const result: DisplayPiece[] = [];
	for (const original of Object.values(doc.pieces)) {
		const piece = extruded?.id === original.id ? extruded : original;
		const preview = drag?.preview[piece.id];
		if (preview && drag.duplicate) {
			result.push({ piece, selected: false, ghost: false });
			result.push({
				piece: { ...piece, ...preview, id: `${piece.id}:copy` },
				selected: true,
				ghost: true,
			});
		} else {
			result.push({
				piece: preview ? { ...piece, ...preview } : piece,
				selected: selected.has(piece.id),
				ghost: false,
			});
		}
	}
	return result;
}
