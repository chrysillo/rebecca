import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";
import { AXIS_COLOR } from "@/colors";
import type { Axis } from "@/geometry/vec";
import {
	GIZMO_RENDER_ORDER,
	PLANE_ORIENTATION,
	ROTATE_RADIUS,
} from "@/scene/shared/gizmoStyle";

type Point = [number, number, number];

/** The rings stay neutral until their arc is hovered or dragged. */
const GUIDE_COLOR = "#a3a3a3";
/** Tick every 15°, a long one every 90° (where the snap steps land). */
const TICK_STEP = 15;
const TICK_LONG_EVERY = 90;
const TICK_SHORT = 0.035;
const TICK_LONG = 0.07;
/** The rotation axis, drawn as a dashed hairline through the centre. */
const AXIS_HALF_LENGTH = 1;
/** Dashes in gizmo units (~2 px on, 3 px off). */
const DASH = 0.016;
const GAP = 0.024;
/** The camera direction is rounded to this many degrees, so the ring only re-renders as it moves. */
const ANGLE_STEP = 2;
/** Below this (sin of the angle between view and ring plane), the ring is face-on: all of it is in front. */
const FACE_ON = 0.2;
/** Drawn under the handles. */
const RENDER_ORDER = GIZMO_RENDER_ORDER - 5;

/**
 * The circle a rotate handle turns around, always shown like a calibrated dial: the half nearer
 * the camera solid with 15° ticks, the far half dashed and fainter, and the axis as a dashed
 * hairline. When `active` (its arc is hovered or dragged) it takes the axis colour.
 */
export function RotationGuide({
	axis,
	active,
}: {
	axis: Axis;
	active: boolean;
}) {
	const plane = useRef<Group>(null);
	// Angle (degrees, in the ring's plane) of the ring's nearest point to the camera; null when face-on.
	const [near, setNear] = useState<number | null>(null);

	useFrame(({ camera }) => {
		const g = plane.current;
		if (!g) return;
		const view = g.worldToLocal(camera.position.clone());
		const inPlane = Math.hypot(view.x, view.y) / view.length();
		const next =
			inPlane < FACE_ON
				? null
				: Math.round(
						(Math.atan2(view.y, view.x) * 180) / Math.PI / ANGLE_STEP,
					) * ANGLE_STEP;
		if (next !== near) setNear(next);
	});

	const color = active ? AXIS_COLOR[axis] : GUIDE_COLOR;
	const common = {
		color,
		depthTest: false,
		transparent: true,
		renderOrder: RENDER_ORDER,
	};
	const front = near === null ? arc(0, 360) : arc(near - 90, near + 90);
	const ticks = tickSegments(near);

	return (
		<group ref={plane} rotation={PLANE_ORIENTATION[axis]}>
			<Line
				points={front}
				lineWidth={active ? 1.75 : 1.25}
				opacity={active ? 0.8 : 0.5}
				{...common}
			/>
			{near !== null && (
				<Line
					points={arc(near + 90, near + 270)}
					lineWidth={1}
					dashed
					dashSize={DASH}
					gapSize={GAP}
					opacity={active ? 0.45 : 0.22}
					{...common}
				/>
			)}
			<Line
				points={ticks}
				segments
				lineWidth={1}
				opacity={active ? 0.9 : 0.55}
				{...common}
			/>
			<Line
				points={[
					[0, 0, -AXIS_HALF_LENGTH],
					[0, 0, AXIS_HALF_LENGTH],
				]}
				lineWidth={1}
				dashed
				dashSize={DASH}
				gapSize={GAP}
				opacity={0.45}
				{...common}
				color={AXIS_COLOR[axis]}
			/>
		</group>
	);
}

/** Points along the ring from `from` to `to` degrees. */
function arc(from: number, to: number): Point[] {
	const steps = Math.ceil((to - from) / 3);
	return Array.from({ length: steps + 1 }, (_, i) =>
		onRing(ROTATE_RADIUS, from + ((to - from) * i) / steps),
	);
}

/** Tick segments (pairs of points) on the near half, pointing inwards from the ring. */
function tickSegments(near: number | null): Point[] {
	const points: Point[] = [];
	for (let deg = 0; deg < 360; deg += TICK_STEP) {
		if (near !== null && Math.cos(((deg - near) * Math.PI) / 180) <= 0)
			continue;
		const length = deg % TICK_LONG_EVERY === 0 ? TICK_LONG : TICK_SHORT;
		points.push(
			onRing(ROTATE_RADIUS, deg),
			onRing(ROTATE_RADIUS - length, deg),
		);
	}
	return points;
}

function onRing(radius: number, deg: number): Point {
	const a = (deg * Math.PI) / 180;
	return [radius * Math.cos(a), radius * Math.sin(a), 0];
}
