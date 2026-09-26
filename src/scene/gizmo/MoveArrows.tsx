import type { ThreeEvent } from "@react-three/fiber";
import { DoubleSide } from "three";
import { AXIS_COLOR, HANDLE_HOVER_COLOR } from "@/colors";
import { AXES, type Axis, axisVector, type Vec3 } from "@/geometry/vec";
import type { CameraView } from "@/scene/gizmo/useCameraView";
import { useMoveDrag } from "@/scene/gizmo/useMoveDrag";
import { SolidArrow } from "@/scene/shared/gizmoShapes";
import {
	DIM_OPACITY,
	GIZMO_USER_DATA,
	HANDLE_HIT_RADIUS,
} from "@/scene/shared/gizmoStyle";
import { useGizmoHover } from "@/scene/shared/useGizmoHover";

/** Arrow rotations for the hit cylinders: a cylinder points along +Y by default. */
const ARROW_ROTATION: Record<Axis, [number, number, number]> = {
	x: [0, 0, -Math.PI / 2],
	y: [0, 0, 0],
	z: [Math.PI / 2, 0, 0],
};

/**
 * Arrow layout along its axis, in gizmo units. Short and clear of the rotate rings (radius 0.8);
 * X is a little shorter, as it runs nearest the viewer in the default view.
 */
const START = 0.34;
const TIP: Record<Axis, number> = { x: 0.76, y: 0.82, z: 0.82 };
/** The grab area reaches a little past the arrow tip. */
const HIT_PAST_TIP = 0.05;

/**
 * X/Y/Z arrows. Dragging an arrow moves the selection along that axis. Like Shapr3D, each arrow
 * points to the camera's side of the gizmo (flipping as you orbit), and one aimed straight at the
 * camera is hidden, since it's just a dot and can't be dragged. Moving works along the axis line
 * either way, so flipping is purely visual.
 */
export function MoveArrows({
	origin,
	view,
}: {
	origin: Vec3;
	view: CameraView;
}) {
	const drag = useMoveDrag(origin);

	return (
		<group scale={view.sides}>
			{AXES.filter((a) => !view.headOn.includes(a)).map((axis) => (
				<Arrow
					key={axis}
					axis={axis}
					onPointerDown={drag.onPointerDown(axis)}
					onPointerMove={drag.onPointerMove}
					onPointerUp={drag.onPointerUp}
				/>
			))}
		</group>
	);
}

type HandleEvents = {
	onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
	onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
	onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
};

/** One solid arrow with a fatter invisible hit area. */
function Arrow({ axis, ...events }: HandleEvents & { axis: Axis }) {
	const hover = useGizmoHover(`move:${axis}`);
	const dir = axisVector(axis);
	const at = (r: number): [number, number, number] => [
		dir.x * r,
		dir.y * r,
		dir.z * r,
	];
	const hitEnd = TIP[axis] + HIT_PAST_TIP;
	return (
		<>
			<SolidArrow
				from={at(START)}
				to={at(TIP[axis])}
				color={hover.hovered ? HANDLE_HOVER_COLOR : AXIS_COLOR[axis]}
				opacity={hover.dim ? DIM_OPACITY : 1}
			/>
			<group rotation={ARROW_ROTATION[axis]}>
				<mesh
					position={[0, (START + hitEnd) / 2, 0]}
					userData={GIZMO_USER_DATA}
					onPointerOver={hover.onPointerOver}
					onPointerOut={hover.onPointerOut}
					{...events}
				>
					<cylinderGeometry
						args={[HANDLE_HIT_RADIUS, HANDLE_HIT_RADIUS, hitEnd - START, 8]}
					/>
					{/* Double-sided: the arrows sit in a mirrored group, which flips winding for raycasts. */}
					<meshBasicMaterial
						transparent
						opacity={0}
						depthWrite={false}
						side={DoubleSide}
					/>
				</mesh>
			</group>
		</>
	);
}

export type { HandleEvents };
