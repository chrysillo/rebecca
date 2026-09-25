import { Grid, Line } from "@react-three/drei";
import { useMemo } from "react";
import { piecesAabb } from "@/geometry/box";
import { useAppStore } from "@/state/store";

const SECTION = 1000;
export const AXIS_X = "#df7468";
export const AXIS_Y = "#5fae74";
export const AXIS_Z = "#5b8fd6";
/** Grid shown around the pieces, beyond their extent, in mm. */
const MARGIN = 1000;
/** Half-size of the grid when the scene is empty. */
const EMPTY_HALF = 2000;

type Extent = { cx: number; cy: number; width: number; depth: number };

/**
 * A finite floor grid on Z = 0 covering the pieces plus a margin.
 * The grid is centred on a whole metre so its lines stay on round world coordinates.
 */
export function Floor() {
	const pieces = useAppStore((s) => s.doc.pieces);
	const extent = useMemo(() => floorExtent(Object.values(pieces)), [pieces]);

	const x0 = extent.cx - extent.width / 2;
	const x1 = extent.cx + extent.width / 2;
	const y0 = extent.cy - extent.depth / 2;
	const y1 = extent.cy + extent.depth / 2;

	return (
		<>
			<Grid
				args={[extent.width, extent.depth]}
				position={[extent.cx, extent.cy, 0]}
				rotation={[Math.PI / 2, 0, 0]}
				cellSize={100}
				cellThickness={0.6}
				cellColor="#dedede"
				sectionSize={SECTION}
				sectionThickness={1}
				sectionColor="#c6c6c6"
				fadeDistance={1e6}
			/>
			{/* World axes on the floor, where the grid covers them: X red, Y green. */}
			{y0 <= 0 && y1 >= 0 && (
				<Line
					points={[
						[x0, 0, 0.5],
						[x1, 0, 0.5],
					]}
					color={AXIS_X}
					transparent
					opacity={0.7}
					lineWidth={1.5}
				/>
			)}
			{x0 <= 0 && x1 >= 0 && (
				<Line
					points={[
						[0, y0, 0.5],
						[0, y1, 0.5],
					]}
					color={AXIS_Y}
					transparent
					opacity={0.7}
					lineWidth={1.5}
				/>
			)}
		</>
	);
}

function floorExtent(pieces: Parameters<typeof piecesAabb>[0]): Extent {
	if (pieces.length === 0)
		return { cx: 0, cy: 0, width: 2 * EMPTY_HALF, depth: 2 * EMPTY_HALF };
	const { min, max } = piecesAabb(pieces);
	const cx = roundToSection((min.x + max.x) / 2);
	const cy = roundToSection((min.y + max.y) / 2);
	const halfX = ceilToSection(Math.max(max.x - cx, cx - min.x) + MARGIN);
	const halfY = ceilToSection(Math.max(max.y - cy, cy - min.y) + MARGIN);
	return { cx, cy, width: 2 * halfX, depth: 2 * halfY };
}

const roundToSection = (n: number) => Math.round(n / SECTION) * SECTION;
const ceilToSection = (n: number) => Math.ceil(n / SECTION) * SECTION;
