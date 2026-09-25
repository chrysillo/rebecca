import type { Piece } from "../model/types";
import { pieceCorners } from "./box";

/** Lowest point of the piece in world Z. */
export const lowestZ = (piece: Piece): number =>
	Math.min(...pieceCorners(piece).map((c) => c.z));

/** Raises the piece if any part of it would be below the floor (Z = 0). */
export function clampToFloor<P extends Piece>(piece: P): P {
	const below = lowestZ(piece);
	if (below >= -1e-9) return piece;
	return {
		...piece,
		// Round up (to the micron) so rounding can never leave the piece below the floor.
		position: {
			...piece.position,
			z: Math.ceil((piece.position.z - below) * 1000) / 1000,
		},
	};
}
