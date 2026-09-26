import { type FaceRef, faceCentre, faceNormal } from "@/geometry/box";
import { clampToFloor, lowestZ } from "@/geometry/floor";
import {
	AXES,
	add,
	dot,
	roundMm,
	roundVec,
	scale,
	type Vec3,
} from "@/geometry/vec";
import {
	dimensionAlong,
	type EditableDimension,
	isEditableDimension,
} from "@/model/dimensions";
import type { Id, Piece } from "@/model/types";

/** Extruding can shrink a piece, but never below this. */
const MIN_DIMENSION = 1;
/** How far apart (mm) two faces' planes may be and still extrude together. */
const PLANE_TOLERANCE = 0.05;
/** How closely two faces must point the same way (cosine of the angle between them). */
const PARALLEL_COS = 1 - 1e-6;

/** The dimension a face extrudes, or null when that dimension is fixed (e.g. sheet thickness). */
export function extrudableDimension(
	piece: Piece,
	face: FaceRef,
): EditableDimension | null {
	const key = dimensionAlong(piece.kind, face.axis);
	return isEditableDimension(piece.kind, key) ? key : null;
}

/** Every face of the piece that can be extruded: a sheet's four edges, a rail's two ends. */
export function extrudableFaces(piece: Piece): FaceRef[] {
	return AXES.flatMap((axis) =>
		([-1, 1] as const).map((sign) => ({ pieceId: piece.id, axis, sign })),
	).filter((face) => extrudableDimension(piece, face));
}

/**
 * The pieces' extrudable faces, grouped so faces lying in one plane and pointing the same way
 * (e.g. the top ends of four legs) extrude together. Groups and the faces in them keep the
 * pieces' order.
 */
export function coplanarFaceGroups(pieces: Piece[]): FaceRef[][] {
	const groups: { normal: Vec3; offset: number; faces: FaceRef[] }[] = [];
	for (const piece of pieces)
		for (const face of extrudableFaces(piece)) {
			const normal = faceNormal(piece, face.axis, face.sign);
			const offset = dot(normal, faceCentre(piece, face));
			const group = groups.find(
				(g) =>
					dot(g.normal, normal) > PARALLEL_COS &&
					Math.abs(g.offset - offset) < PLANE_TOLERANCE,
			);
			if (group) group.faces.push(face);
			else groups.push({ normal, offset, faces: [face] });
		}
	return groups.map((g) => g.faces);
}

/**
 * The piece with one face pushed (+) or pulled (−) along its normal by `distance` mm.
 * The opposite face stays put. Returns null if that face's dimension is fixed.
 */
export function extrudePiece(
	piece: Piece,
	face: FaceRef,
	distance: number,
): Piece | null {
	const key = extrudableDimension(piece, face);
	if (!key) return null;
	const current = piece[key];
	const normal = faceNormal(piece, face.axis, face.sign);

	const build = (d: number): Piece => {
		const value = roundMm(Math.max(MIN_DIMENSION, current + d));
		const grown = value - current;
		return {
			...piece,
			[key]: value,
			position: roundVec(add(piece.position, scale(normal, grown / 2))),
		};
	};

	let result = build(distance);
	// A face pushed down must stop at the floor rather than lift the whole piece.
	const below = -lowestZ(result);
	if (below > 1e-9 && normal.z < -1e-9)
		result = build(distance - below / -normal.z);
	return clampToFloor(result);
}

/**
 * Extrudes several faces by the same distance (each along its own normal), possibly several
 * on one piece (e.g. both ends of a rail). Returns just the changed pieces, or null if any face is fixed.
 */
export function extrudeAll(
	pieces: Record<Id, Piece>,
	faces: FaceRef[],
	distance: number,
): Record<Id, Piece> | null {
	const changed: Record<Id, Piece> = {};
	for (const face of faces) {
		const piece = changed[face.pieceId] ?? pieces[face.pieceId];
		if (!piece) continue;
		const next = extrudePiece(piece, face, distance);
		if (!next) return null;
		changed[face.pieceId] = next;
	}
	return changed;
}
