import type { ThreeEvent } from "@react-three/fiber";
import { useState } from "react";
import { DoubleSide } from "three";
import { AXIS_COLOR, HANDLE_HOVER_COLOR } from "@/colors";
import { AXES, type Axis, type Vec3 } from "@/geometry/vec";
import type { CameraView } from "@/scene/gizmo/useCameraView";
import { useMoveDrag } from "@/scene/gizmo/useMoveDrag";
import {
	GIZMO_RENDER_ORDER,
	GIZMO_USER_DATA,
	gizmoMaterialProps,
	HANDLE_HIT_RADIUS,
} from "@/scene/shared/gizmoStyle";

/** Arrow rotations: a cylinder points along +Y by default. */
const ARROW_ROTATION: Record<Axis, [number, number, number]> = {
	x: [0, 0, -Math.PI / 2],
	y: [0, 0, 0],
	z: [Math.PI / 2, 0, 0],
};

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
	const [hovered, setHovered] = useState<Axis | null>(null);
	const drag = useMoveDrag(origin);

	return (
		<group scale={view.sides}>
			{AXES.filter((a) => !view.headOn.includes(a)).map((axis) => (
				<Arrow
					key={axis}
					axis={axis}
					color={hovered === axis ? HANDLE_HOVER_COLOR : AXIS_COLOR[axis]}
					onPointerDown={drag.onPointerDown(axis)}
					onPointerMove={drag.onPointerMove}
					onPointerUp={drag.onPointerUp}
					onPointerOver={() => setHovered(axis)}
					onPointerOut={() => setHovered(null)}
				/>
			))}
		</group>
	);
}

type HandleProps = {
	axis: Axis;
	color: string;
	onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
	onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
	onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
	onPointerOver: () => void;
	onPointerOut: () => void;
};

/** Arrow layout along its axis, in gizmo units (1 = full gizmo size). */
/** Shafts start well out from the centre, leaving room for the pivot dot and rotate arcs. */
const SHAFT_START = 0.45;
const SHAFT_END = 0.86;
const HEAD_LENGTH = 0.14;
/** The grab area reaches a little past the arrow tip. */
const HIT_END = 1.08;

/** One slim arrow, drawn on top of everything, with a fatter invisible hit area. */
function Arrow({ axis, color, ...events }: HandleProps) {
	const shaft = SHAFT_END - SHAFT_START;
	return (
		<group rotation={ARROW_ROTATION[axis]}>
			<mesh
				position={[0, SHAFT_START + shaft / 2, 0]}
				renderOrder={GIZMO_RENDER_ORDER}
			>
				<cylinderGeometry args={[0.008, 0.008, shaft, 8]} />
				<meshBasicMaterial {...gizmoMaterialProps(color)} />
			</mesh>
			<mesh
				position={[0, SHAFT_END + HEAD_LENGTH / 2, 0]}
				renderOrder={GIZMO_RENDER_ORDER}
			>
				<coneGeometry args={[0.038, HEAD_LENGTH, 20]} />
				<meshBasicMaterial {...gizmoMaterialProps(color)} />
			</mesh>
			<mesh
				position={[0, (SHAFT_START + HIT_END) / 2, 0]}
				userData={GIZMO_USER_DATA}
				{...events}
			>
				<cylinderGeometry
					args={[
						HANDLE_HIT_RADIUS,
						HANDLE_HIT_RADIUS,
						HIT_END - SHAFT_START,
						8,
					]}
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
	);
}

export type { HandleProps };
