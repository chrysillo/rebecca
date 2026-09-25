import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { AXES, type Axis, add, dot, scale, type Vec3 } from "@/geometry/vec";
import { pieceSize } from "@/model/dimensions";
import type { Id, Piece, Rotation } from "@/model/types";

/** An infinite plane: every point p on it satisfies dot(normal, p) === offset. */
export type Plane = { normal: Vec3; offset: number };

/** One face of a piece's box, identified by local axis and side. */
export type FaceRef = { pieceId: Id; axis: Axis; sign: 1 | -1 };

/** A plane that came from a piece face, or `face: null` for the floor. */
export type FacePlane = Plane & { face: FaceRef | null };

export type Aabb = { min: Vec3; max: Vec3 };

const DEG = Math.PI / 180;

// three.js math is used internally only; inputs and outputs stay plain data.
const toVector3 = (v: Vec3) => new Vector3(v.x, v.y, v.z);
const fromVector3 = (v: Vector3): Vec3 => ({ x: v.x, y: v.y, z: v.z });

export const rotationQuaternion = (r: Rotation): Quaternion =>
	new Quaternion().setFromEuler(
		new Euler(r.x * DEG, r.y * DEG, r.z * DEG, "XYZ"),
	);

/** Rotates a local-space direction into world space. */
export function rotateVector(v: Vec3, r: Rotation): Vec3 {
	return fromVector3(toVector3(v).applyQuaternion(rotationQuaternion(r)));
}

function pieceMatrix(piece: Piece): Matrix4 {
	return new Matrix4().compose(
		toVector3(piece.position),
		rotationQuaternion(piece.rotation),
		new Vector3(1, 1, 1),
	);
}

const SIGNS = [-1, 1] as const;

/** The 8 box corners in world space. */
export function pieceCorners(piece: Piece): Vec3[] {
	const half = scale(pieceSize(piece), 0.5);
	const matrix = pieceMatrix(piece);
	const corners: Vec3[] = [];
	for (const sx of SIGNS)
		for (const sy of SIGNS)
			for (const sz of SIGNS) {
				const local = new Vector3(sx * half.x, sy * half.y, sz * half.z);
				corners.push(fromVector3(local.applyMatrix4(matrix)));
			}
	return corners;
}

/** The 6 face planes in world space, with outward normals. */
export function pieceFacePlanes(piece: Piece): FacePlane[] {
	const size = pieceSize(piece);
	return AXES.flatMap((axis) =>
		SIGNS.map((sign) => {
			const normal = faceNormal(piece, axis, sign);
			const point = add(piece.position, scale(normal, size[axis] / 2));
			return {
				normal,
				offset: dot(normal, point),
				face: { pieceId: piece.id, axis, sign },
			};
		}),
	);
}

/** World-space outward normal of one face. */
export function faceNormal(piece: Piece, axis: Axis, sign: 1 | -1): Vec3 {
	const local = { x: 0, y: 0, z: 0, [axis]: sign };
	return rotateVector(local, piece.rotation);
}

/** The 4 world-space corners of one face, in drawing order. */
export function faceCorners(piece: Piece, axis: Axis, sign: 1 | -1): Vec3[] {
	const half = scale(pieceSize(piece), 0.5);
	const [u, v] = AXES.filter((a) => a !== axis);
	const matrix = pieceMatrix(piece);
	const square: [number, number][] = [
		[-1, -1],
		[1, -1],
		[1, 1],
		[-1, 1],
	];
	return square.map(([su, sv]) => {
		const local = { x: 0, y: 0, z: 0 };
		local[axis] = sign * half[axis];
		local[u] = su * half[u];
		local[v] = sv * half[v];
		return fromVector3(toVector3(local).applyMatrix4(matrix));
	});
}

export function pointsAabb(points: Vec3[]): Aabb {
	const min = { x: Infinity, y: Infinity, z: Infinity };
	const max = { x: -Infinity, y: -Infinity, z: -Infinity };
	for (const p of points)
		for (const a of AXES) {
			min[a] = Math.min(min[a], p[a]);
			max[a] = Math.max(max[a], p[a]);
		}
	return { min, max };
}

export const pieceAabb = (piece: Piece): Aabb =>
	pointsAabb(pieceCorners(piece));

export const piecesAabb = (pieces: Piece[]): Aabb =>
	pointsAabb(pieces.flatMap(pieceCorners));

/** The box face whose outward normal (in the piece's own frame) is `localNormal`. */
export function faceFromLocalNormal(pieceId: Id, localNormal: Vec3): FaceRef {
	const axis = AXES.reduce((best, a) =>
		Math.abs(localNormal[a]) > Math.abs(localNormal[best]) ? a : best,
	);
	return { pieceId, axis, sign: localNormal[axis] < 0 ? -1 : 1 };
}

/** World-space centre of one face. */
export function faceCentre(piece: Piece, face: FaceRef): Vec3 {
	const size = pieceSize(piece);
	return add(
		piece.position,
		scale(faceNormal(piece, face.axis, face.sign), size[face.axis] / 2),
	);
}

export const sameFace = (a: FaceRef | null, b: FaceRef | null): boolean =>
	a === b ||
	(!!a &&
		!!b &&
		a.pieceId === b.pieceId &&
		a.axis === b.axis &&
		a.sign === b.sign);

/**
 * One of a box's 12 edges: the local axis it runs along, and which side it sits on for each of
 * the other two axes (in AXES order, e.g. for an X edge: `u` is its Y side, `v` its Z side).
 */
export type EdgeRef = { pieceId: Id; axis: Axis; u: 1 | -1; v: 1 | -1 };

const otherAxes = (axis: Axis): [Axis, Axis] => {
	const [u, v] = AXES.filter((a) => a !== axis);
	return [u, v];
};

/** Both ends of an edge, in world space. */
export function edgeEnds(piece: Piece, edge: EdgeRef): [Vec3, Vec3] {
	const half = scale(pieceSize(piece), 0.5);
	const [u, v] = otherAxes(edge.axis);
	const matrix = pieceMatrix(piece);
	const end = (along: 1 | -1) => {
		const local = { x: 0, y: 0, z: 0 };
		local[edge.axis] = along * half[edge.axis];
		local[u] = edge.u * half[u];
		local[v] = edge.v * half[v];
		return fromVector3(toVector3(local).applyMatrix4(matrix));
	};
	return [end(-1), end(1)];
}

/** The middle of an edge, in world space. */
export function edgeMidpoint(piece: Piece, edge: EdgeRef): Vec3 {
	const [a, b] = edgeEnds(piece, edge);
	return scale(add(a, b), 0.5);
}

/** The four edges around one face. */
export function faceEdges(face: FaceRef): EdgeRef[] {
	const [p, q] = otherAxes(face.axis);
	// Each in-face axis gives two edges (one per side), running along the other in-face axis.
	return [p, q].flatMap((side) =>
		SIGNS.map((sign): EdgeRef => {
			const along = side === p ? q : p;
			const [u, v] = otherAxes(along);
			const signOf = (a: Axis): 1 | -1 => (a === face.axis ? face.sign : sign);
			return { pieceId: face.pieceId, axis: along, u: signOf(u), v: signOf(v) };
		}),
	);
}

export const sameEdge = (a: EdgeRef | null, b: EdgeRef | null): boolean =>
	a === b ||
	(!!a &&
		!!b &&
		a.pieceId === b.pieceId &&
		a.axis === b.axis &&
		a.u === b.u &&
		a.v === b.v);
