import type { Piece } from "@/model/types";

/**
 * Pieces with the same key are identical cuts from the same stock entry, regardless of position
 * or rotation. e.g. "framing|<stockId>|38x63|850" or "sheet|<stockId>|18|800x400". The stock id
 * keeps an 18 mm plywood cut apart from the same cut in 18 mm OSB.
 */
export function cutListKey(piece: Piece): string {
	switch (piece.kind) {
		case "framing": {
			const [a, b] = sorted(piece.width, piece.depth);
			return `framing|${piece.stockId}|${a}x${b}|${piece.length}`;
		}
		case "sheet": {
			const [a, b] = sorted(piece.length, piece.width);
			return `sheet|${piece.stockId}|${piece.thickness}|${b}x${a}`;
		}
	}
}

const sorted = (a: number, b: number): [number, number] =>
	a <= b ? [a, b] : [b, a];
