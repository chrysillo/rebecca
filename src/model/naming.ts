import type { Piece, PieceKind } from "@/model/types";

const KIND_NAME: Record<PieceKind, string> = {
	sheet: "Sheet",
	framing: "Framing",
};

export const kindName = (kind: PieceKind) => KIND_NAME[kind];

/** What new pieces are called in the object list: short, so "Timber 4" rather than "Framing 4". */
const PIECE_NAME: Record<PieceKind, string> = {
	sheet: "Sheet",
	framing: "Timber",
};

/** The name new pieces of a kind get (before their number), also shown on the create wheel. */
export const pieceName = (kind: PieceKind) => PIECE_NAME[kind];

/** Next unused default name for a kind, e.g. "Timber 4". Numbers are never reused after a delete. */
export function defaultName(existing: Piece[], kind: PieceKind): string {
	const prefix = `${PIECE_NAME[kind]} `;
	let highest = 0;
	for (const piece of existing) {
		if (!piece.name.startsWith(prefix)) continue;
		const n = Number(piece.name.slice(prefix.length));
		if (Number.isInteger(n)) highest = Math.max(highest, n);
	}
	return `${prefix}${highest + 1}`;
}
