import type { Piece, PieceKind } from "./types";

const KIND_NAME: Record<PieceKind, string> = {
	sheet: "Sheet",
	framing: "Framing",
};

export const kindName = (kind: PieceKind) => KIND_NAME[kind];

/** Next unused default name for a kind, e.g. "Framing 4". Numbers are never reused after a delete. */
export function defaultName(existing: Piece[], kind: PieceKind): string {
	const prefix = `${KIND_NAME[kind]} `;
	let highest = 0;
	for (const piece of existing) {
		if (!piece.name.startsWith(prefix)) continue;
		const n = Number(piece.name.slice(prefix.length));
		if (Number.isInteger(n)) highest = Math.max(highest, n);
	}
	return `${prefix}${highest + 1}`;
}
