import type { Piece } from "@/model/types";

/**
 * Pieces with the same key are identical cuts, regardless of position or rotation.
 * e.g. "framing|38x63|850" or "sheet|18|800x400".
 */
export function cutListKey(piece: Piece): string {
	switch (piece.kind) {
		case "framing": {
			const [a, b] = sorted(piece.width, piece.depth);
			return `framing|${a}x${b}|${piece.length}`;
		}
		case "sheet": {
			const [a, b] = sorted(piece.length, piece.width);
			return `sheet|${piece.thickness}|${b}x${a}`;
		}
	}
}

const sorted = (a: number, b: number): [number, number] =>
	a <= b ? [a, b] : [b, a];
