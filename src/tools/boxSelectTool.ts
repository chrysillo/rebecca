import type { ScreenPoint } from "@/input/pointer";
import { expandToGroups, type Group } from "@/model/group";
import type { Id } from "@/model/types";

type Rect = { min: ScreenPoint; max: ScreenPoint };

const rectBetween = (a: ScreenPoint, b: ScreenPoint): Rect => ({
	min: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
	max: { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
});

/** A piece as it appears on screen: its box corners, null where one is behind the camera. */
export type ScreenBox = { id: Id; corners: (ScreenPoint | null)[] };

/**
 * The pieces a box dragged between `start` and `end` picks: anything it touches, whichever way it
 * was dragged. A piece brings its whole group; with `single` (Alt), just the piece.
 */
export function piecesInBox(
	boxes: ScreenBox[],
	groups: Record<Id, Group>,
	start: ScreenPoint,
	end: ScreenPoint,
	single: boolean,
): Id[] {
	const rect = rectBetween(start, end);
	const hit = boxes
		.filter((b) => screenBoxTouched(b.corners, rect))
		.map((b) => b.id);
	return single ? hit : expandToGroups(groups, hit);
}

function screenBoxTouched(
	corners: (ScreenPoint | null)[],
	rect: Rect,
): boolean {
	// A piece partly behind the camera is judged by the part in front of it.
	const seen = corners.filter((c): c is ScreenPoint => c !== null);
	return seen.length > 0 && hullTouchesRect(convexHull(seen), rect);
}

/**
 * Whether a convex outline overlaps the rectangle: they're apart only if some line (the rectangle's
 * sides or one of the outline's edges) separates them.
 */
function hullTouchesRect(hull: ScreenPoint[], rect: Rect): boolean {
	const square = [
		rect.min,
		{ x: rect.max.x, y: rect.min.y },
		rect.max,
		{ x: rect.min.x, y: rect.max.y },
	];
	const axes: ScreenPoint[] = [
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
		...hull.map((p, i) => {
			const q = hull[(i + 1) % hull.length];
			return { x: q.y - p.y, y: p.x - q.x };
		}),
	];
	return axes.every((axis) => {
		const a = spread(hull, axis);
		const b = spread(square, axis);
		return a.max >= b.min && b.max >= a.min;
	});
}

function spread(points: ScreenPoint[], axis: ScreenPoint) {
	const along = points.map((p) => p.x * axis.x + p.y * axis.y);
	return { min: Math.min(...along), max: Math.max(...along) };
}

/** The outline around some points (Andrew's monotone chain). */
function convexHull(points: ScreenPoint[]): ScreenPoint[] {
	const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
	if (sorted.length < 3) return sorted;
	const cross = (o: ScreenPoint, a: ScreenPoint, b: ScreenPoint) =>
		(a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
	const half = (pts: ScreenPoint[]) => {
		const out: ScreenPoint[] = [];
		for (const p of pts) {
			while (
				out.length >= 2 &&
				cross(out[out.length - 2], out[out.length - 1], p) <= 0
			)
				out.pop();
			out.push(p);
		}
		out.pop();
		return out;
	};
	const hull = [...half(sorted), ...half([...sorted].reverse())];
	// Every point in the same place (a piece seen as a dot) leaves just that point.
	return hull.length > 0 ? hull : sorted.slice(0, 1);
}
