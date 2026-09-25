import { rotateVector } from "@/geometry/box";
import { clampToFloor } from "@/geometry/floor";
import { add, roundVec, scale, sub } from "@/geometry/vec";
import { pieceSize } from "@/model/dimensions";
import type { Piece } from "@/model/types";

/**
 * The piece with some dimensions changed. It grows or shrinks from its local negative side,
 * so that side stays put (a sheet made thicker keeps its underside; a rail keeps its start).
 */
export function resizePiece(
	piece: Piece,
	sizes: Partial<Record<string, number>>,
): Piece {
	const resized = { ...piece, ...sizes } as Piece;
	const growth = sub(pieceSize(resized), pieceSize(piece));
	const shift = rotateVector(scale(growth, 0.5), piece.rotation);
	return clampToFloor({
		...resized,
		position: roundVec(add(piece.position, shift)),
	});
}
