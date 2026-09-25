import { piecesAabb } from "@/geometry/box";
import { extrudeAll } from "@/geometry/extrude";
import { selectionPivotPoint } from "@/geometry/pivot";
import { add, scale, type Vec3 } from "@/geometry/vec";
import type { Id, Piece, Pivot } from "@/model/types";
import type { DocumentState } from "@/state/document";
import type { DragState } from "@/state/drag";
import { type ExtrudeState, effectiveDistance } from "@/state/extrude";

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

/** The pivot currently in use: a single piece's own, or the group pivot for several. */
export const activePivot = (pieces: Piece[], groupPivot: Pivot): Pivot =>
	pieces.length === 1 ? pieces[0].pivot : groupPivot;

/** Where the gizmo sits and rotation turns (`override` while the pivot dot is being dragged). */
export function selectionPivot(
	pieces: Piece[],
	groupPivot: Pivot,
	override?: Pivot | null,
): Vec3 {
	return selectionPivotPoint(
		pieces,
		override ?? activePivot(pieces, groupPivot),
	);
}

/** Centre of the bounding box around some pieces. */
export function centreOf(pieces: Piece[]): Vec3 {
	const box = piecesAabb(pieces);
	return scale(add(box.min, box.max), 0.5);
}

/** The pieces being extruded, as they would be if the extrude were confirmed now (by id). */
export function extrudePreview(
	doc: DocumentState,
	extrude: ExtrudeState | null,
): Record<Id, Piece> {
	if (!extrude) return {};
	return (
		extrudeAll(doc.pieces, extrude.faces, effectiveDistance(extrude)) ?? {}
	);
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
		const piece = extruded[original.id] ?? original;
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
