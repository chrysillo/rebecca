import { Grid } from "@react-three/drei";
import { useMemo } from "react";
import { piecesAabb } from "@/geometry/box";
import { useAppStore } from "@/state/store";

const SECTION = 1000;
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

	return (
		<Grid
			args={[extent.width, extent.depth]}
			position={[extent.cx, extent.cy, 0]}
			rotation={[Math.PI / 2, 0, 0]}
			cellSize={100}
			cellThickness={0.6}
			cellColor="#b8b3a8"
			sectionSize={SECTION}
			sectionThickness={1.2}
			sectionColor="#8a8478"
			fadeDistance={1e6}
		/>
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
