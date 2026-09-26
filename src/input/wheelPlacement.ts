import type { ScreenPoint } from "@/input/pointer";

/** Outer radius of a radial menu (create and join wheels), in px. */
export const WHEEL_RADIUS = 140;
/** Space kept between a wheel and the window edge, in px. */
export const WHEEL_EDGE = 12;

export const clamp = (v: number, lo: number, hi: number) =>
	Math.max(lo, Math.min(v, hi));

export type ScreenBox = {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
};

/** Space kept between the wheel (and its hint) and whatever it sits beside. */
const BESIDE_GAP = 32;

/**
 * A wheel centre next to `box` (right, left, below, then above) that keeps the wheel fully
 * on screen and off the box, or null if none fits.
 */
export function wheelBeside(
	box: ScreenBox,
	screen: { width: number; height: number },
): ScreenPoint | null {
	const r = WHEEL_RADIUS + WHEEL_EDGE;
	const midX = clamp((box.minX + box.maxX) / 2, r, screen.width - r);
	const midY = clamp((box.minY + box.maxY) / 2, r, screen.height - r);
	const candidates: ScreenPoint[] = [
		{ x: box.maxX + BESIDE_GAP + WHEEL_RADIUS, y: midY },
		{ x: box.minX - BESIDE_GAP - WHEEL_RADIUS, y: midY },
		{ x: midX, y: box.maxY + BESIDE_GAP + WHEEL_RADIUS },
		{ x: midX, y: box.minY - BESIDE_GAP - WHEEL_RADIUS - 40 },
	];
	return (
		candidates.find(
			(c) =>
				c.x >= r &&
				c.x <= screen.width - r &&
				c.y >= r &&
				// Room for the hint under the ring.
				c.y <= screen.height - r - 40,
		) ?? null
	);
}
