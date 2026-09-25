import { Line } from "@react-three/drei";
import type { Axis } from "@/geometry/vec";
import {
	AXIS_COLOR,
	GIZMO_RENDER_ORDER,
	PLANE_ORIENTATION,
	ROTATE_RADIUS,
} from "@/scene/gizmoStyle";

type Point = [number, number, number];

const CIRCLE: Point[] = Array.from({ length: 97 }, (_, i) => {
	const a = (i / 96) * Math.PI * 2;
	return [ROTATE_RADIUS * Math.cos(a), ROTATE_RADIUS * Math.sin(a), 0];
});

/** Tick segments (pairs of points) every `step` degrees, `half` long on each side of the circle. */
function ticks(step: number, half: number, skip = 0): Point[] {
	const points: Point[] = [];
	for (let deg = 0; deg < 360; deg += step) {
		if (skip && deg % skip === 0) continue;
		const a = (deg * Math.PI) / 180;
		const [c, s] = [Math.cos(a), Math.sin(a)];
		points.push([(ROTATE_RADIUS - half) * c, (ROTATE_RADIUS - half) * s, 0]);
		points.push([(ROTATE_RADIUS + half) * c, (ROTATE_RADIUS + half) * s, 0]);
	}
	return points;
}

/** Small ticks every 5° (the fine rotate step), big ones every 45° (the normal step). */
const MINOR_TICKS = ticks(5, 0.02, 45);
const MAJOR_TICKS = ticks(45, 0.07);

/** The rotation axis itself, drawn through the pivot (local Z of the plane is the axis). */
const AXIS_LINE: Point[] = [
	[0, 0, -1.4],
	[0, 0, 1.4],
];

/**
 * The circle a rotate handle turns around. Always shown faintly so each arrow's plane is obvious;
 * when `active` (hovered or dragging) it brightens and adds snap-step ticks (5°/45°) and the dashed rotation axis.
 */
export function RotationGuide({
	axis,
	active,
}: {
	axis: Axis;
	active: boolean;
}) {
	const color = AXIS_COLOR[axis];
	const common = {
		color,
		depthTest: false,
		transparent: true,
		renderOrder: GIZMO_RENDER_ORDER - 2,
	};
	return (
		<group rotation={PLANE_ORIENTATION[axis]}>
			<Line
				points={CIRCLE}
				lineWidth={active ? 1.5 : 1}
				opacity={active ? 0.6 : 0.3}
				{...common}
			/>
			{active && (
				<>
					<Line
						points={MINOR_TICKS}
						segments
						lineWidth={1}
						opacity={0.6}
						{...common}
					/>
					<Line
						points={MAJOR_TICKS}
						segments
						lineWidth={2}
						opacity={0.8}
						{...common}
					/>
				</>
			)}
			{active && (
				<Line
					points={AXIS_LINE}
					lineWidth={1.5}
					dashed
					dashSize={0.06}
					gapSize={0.04}
					opacity={0.8}
					{...common}
				/>
			)}
		</group>
	);
}
