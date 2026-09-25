import { type BufferGeometry, Triangle, Vector3 } from "three";

/** Faces meeting at less than this angle (degrees) count as one flat face: no line between them. */
const CREASE_DEGREES = 15;
/** How close (mm) a point must be to a triangle's edge to count as lying on it. */
const ON_EDGE = 0.005;

type Tri = { corners: [Vector3, Vector3, Vector3]; normal: Vector3 };

const distanceToSegment = (p: Vector3, a: Vector3, b: Vector3) => {
	const ab = b.clone().sub(a);
	const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
	return a.clone().addScaledVector(ab, t).distanceTo(p);
};

/**
 * The lines to outline a solid with: triangle edges where the surface actually bends.
 *
 * three's EdgesGeometry pairs triangle edges by exact endpoints. A boolean cut splits faces
 * unevenly (one long edge against two short ones), so it draws stray lines across flat faces
 * and can drop real corners. Here each edge is tested at its midpoint against every triangle
 * that touches it there: if any of them lies flat against it, the edge is inside a face.
 * Returns segment endpoints as a flat [x, y, z, x, y, z, …] list.
 */
export function featureEdges(geometry: BufferGeometry): number[] {
	const position = geometry.getAttribute("position");
	const index = geometry.getIndex();
	const vertex = (i: number) =>
		new Vector3().fromBufferAttribute(position, index ? index.getX(i) : i);
	const count = index ? index.count : position.count;

	const tris: Tri[] = [];
	for (let i = 0; i < count; i += 3) {
		const corners: Tri["corners"] = [vertex(i), vertex(i + 1), vertex(i + 2)];
		const triangle = new Triangle(...corners);
		// Zero-area slivers have no meaningful direction; they neither add nor hide lines.
		if (triangle.getArea() < 1e-6) continue;
		tris.push({ corners, normal: triangle.getNormal(new Vector3()) });
	}

	const flat = Math.cos((CREASE_DEGREES * Math.PI) / 180);
	const seen = new Set<string>();
	const out: number[] = [];
	const key = (v: Vector3) =>
		`${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;

	for (const tri of tris) {
		for (let e = 0; e < 3; e++) {
			const a = tri.corners[e];
			const b = tri.corners[(e + 1) % 3];
			const id = [key(a), key(b)].sort().join("|");
			if (seen.has(id)) continue;
			seen.add(id);
			const mid = a.clone().add(b).multiplyScalar(0.5);
			const insideFace = tris.some(
				(other) =>
					other !== tri &&
					other.normal.dot(tri.normal) > flat &&
					other.corners.some(
						(c, i) =>
							distanceToSegment(mid, c, other.corners[(i + 1) % 3]) < ON_EDGE,
					),
			);
			if (!insideFace) out.push(a.x, a.y, a.z, b.x, b.y, b.z);
		}
	}
	return out;
}
