import {
	type Aabb,
	type EdgeRef,
	edgeMidpoint,
	pieceAabb,
	piecesAabb,
} from "@/geometry/box";
import {
	AXES,
	type Axis,
	dot,
	scale,
	sub,
	type Vec3,
	vec3,
} from "@/geometry/vec";
import type { Id, Piece } from "@/model/types";

/** A dimension line: where it starts and ends, and the distance it reports (mm). */
export type Dimension = { start: Vec3; end: Vec3; distance: number };

const length = (v: Vec3) => Math.sqrt(dot(v, v));

/**
 * The straight (X, Y or Z) dimension from the middle of one edge to the second edge: along the
 * axis where they are furthest apart, ending level with the second edge's middle on that axis.
 */
export function measureEdges(
	pieces: Record<Id, Piece>,
	from: EdgeRef,
	to: EdgeRef,
): Dimension | null {
	const a = pieces[from.pieceId];
	const b = pieces[to.pieceId];
	if (!a || !b) return null;
	const start = edgeMidpoint(a, from);
	const target = edgeMidpoint(b, to);
	// Always a straight X, Y or Z dimension (never diagonal): along the axis with the largest gap.
	const gap = sub(target, start);
	const axis = AXES.reduce((m, ax) =>
		Math.abs(gap[ax]) > Math.abs(gap[m]) ? ax : m,
	);
	const end = { ...start, [axis]: target[axis] };
	return { start, end, distance: Math.abs(gap[axis]) };
}

/**
 * Live gaps while dragging along one world axis: from the moving pieces' box to the nearest
 * piece ahead and behind (pieces whose boxes overlap it across the other two axes), plus the
 * floor below when moving vertically. Box-based, so exact for unrotated pieces.
 */
export function axisGaps(
	moving: Piece[],
	others: Piece[],
	axis: Axis,
): Dimension[] {
	if (moving.length === 0) return [];
	const box = piecesAabb(moving);
	const across = AXES.filter((a) => a !== axis);
	const overlaps = (o: Aabb) =>
		across.every((a) => o.min[a] < box.max[a] && o.max[a] > box.min[a]);

	let ahead: { gap: number; box: Aabb } | null = null;
	let behind: { gap: number; box: Aabb } | null = null;
	for (const other of others) {
		const o = pieceAabb(other);
		if (!overlaps(o)) continue;
		const front = o.min[axis] - box.max[axis];
		const back = box.min[axis] - o.max[axis];
		if (front >= 0 && (!ahead || front < ahead.gap))
			ahead = { gap: front, box: o };
		if (back >= 0 && (!behind || back < behind.gap))
			behind = { gap: back, box: o };
	}

	const dims: Dimension[] = [];
	const at = (value: number, overlapWith: Aabb | null): Vec3 => {
		// Run the line through the middle of the shared cross-section, so it lands on both faces.
		const p = { x: 0, y: 0, z: 0 };
		for (const a of across) {
			const lo = overlapWith
				? Math.max(box.min[a], overlapWith.min[a])
				: box.min[a];
			const hi = overlapWith
				? Math.min(box.max[a], overlapWith.max[a])
				: box.max[a];
			p[a] = (lo + hi) / 2;
		}
		p[axis] = value;
		return p;
	};
	if (ahead)
		dims.push({
			start: at(box.max[axis], ahead.box),
			end: at(ahead.box.min[axis], ahead.box),
			distance: ahead.gap,
		});
	if (behind)
		dims.push({
			start: at(box.min[axis], behind.box),
			end: at(behind.box.max[axis], behind.box),
			distance: behind.gap,
		});
	if (axis === "z" && !behind && box.min.z > 0)
		dims.push({
			start: at(box.min.z, null),
			end: at(0, null),
			distance: box.min.z,
		});
	return dims;
}

/** "450 mm", or one decimal place when needed ("12.5 mm"). */
export const formatMm = (mm: number): string =>
	`${Math.round(mm * 10) / 10} mm`;

/** How far (mm) a dimension line sits off its measured points, per stacking level. */
export const DIMENSION_OFFSET = 60;

/**
 * Sideways in the floor plane, square to the line, on the side away from `awayFrom` (the measured
 * pieces), so the dimension sits beside the model rather than over it. A vertical line goes along X.
 */
export function dimensionOffsetDirection(
	along: Vec3,
	from: Vec3,
	awayFrom?: Vec3,
): Vec3 {
	const side = vec3(-along.y, along.x, 0);
	const len = Math.hypot(side.x, side.y);
	const dir = len > 1e-6 ? scale(side, 1 / len) : vec3(1, 0, 0);
	if (!awayFrom) return dir;
	const toward = sub(awayFrom, from);
	return dir.x * toward.x + dir.y * toward.y > 0 ? scale(dir, -1) : dir;
}

/**
 * Stacking levels (0 = nearest the model) so dimensions don't sit on top of each other: two lines
 * clash when they run the same way, step out to the same side, lie close together and their spans
 * overlap. Shorter dimensions are placed first, so bigger ones end up further out.
 */
export function stackDimensions(
	items: { dimension: Dimension; awayFrom?: Vec3 }[],
): number[] {
	const info = items.map(({ dimension: d, awayFrom }) => {
		const along = sub(d.end, d.start);
		const len = length(along) || 1;
		const dir = scale(along, 1 / len);
		return { d, dir, side: dimensionOffsetDirection(along, d.start, awayFrom) };
	});
	const levels = new Array<number>(items.length).fill(0);
	const order = info
		.map((_, i) => i)
		.sort((a, b) => info[a].d.distance - info[b].d.distance);
	const placed: number[] = [];
	for (const i of order) {
		let level = 0;
		while (placed.some((j) => levels[j] === level && clash(info[i], info[j])))
			level++;
		levels[i] = level;
		placed.push(i);
	}
	return levels;
}

type Laid = { d: Dimension; dir: Vec3; side: Vec3 };

function clash(a: Laid, b: Laid): boolean {
	if (Math.abs(dot(a.dir, b.dir)) < 0.95 || dot(a.side, b.side) < 0.9)
		return false;
	// Close together: b's start lies near a's line (within two offset levels).
	const rel = sub(b.d.start, a.d.start);
	const across = sub(rel, scale(a.dir, dot(rel, a.dir)));
	if (length(across) > DIMENSION_OFFSET * 2) return false;
	// Spans overlap along the shared direction.
	const span = (d: Dimension) => {
		const p = dot(sub(d.start, a.d.start), a.dir);
		const q = dot(sub(d.end, a.d.start), a.dir);
		return [Math.min(p, q), Math.max(p, q)];
	};
	const [a0, a1] = span(a.d);
	const [b0, b1] = span(b.d);
	return a0 < b1 - 1e-6 && b0 < a1 - 1e-6;
}
