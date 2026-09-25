import type { ThreeEvent } from "@react-three/fiber";
import { useState } from "react";
import { AXES, type Axis, type Vec3 } from "../geometry/vec";
import {
	AXIS_COLOR,
	GIZMO_RENDER_ORDER,
	GIZMO_USER_DATA,
	gizmoMaterialProps,
	HOVER_COLOR,
} from "./gizmoStyle";
import { useMoveDrag } from "./useMoveDrag";

/** Arrow rotations: a cylinder points along +Y by default. */
const ARROW_ROTATION: Record<Axis, [number, number, number]> = {
	x: [0, 0, -Math.PI / 2],
	y: [0, 0, 0],
	z: [Math.PI / 2, 0, 0],
};

/** X/Y/Z arrows. Dragging an arrow moves the selection along that axis. */
export function MoveArrows({ origin }: { origin: Vec3 }) {
	const [hovered, setHovered] = useState<Axis | null>(null);
	const drag = useMoveDrag(origin);

	return (
		<>
			{AXES.map((axis) => (
				<Arrow
					key={axis}
					axis={axis}
					color={hovered === axis ? HOVER_COLOR : AXIS_COLOR[axis]}
					onPointerDown={drag.onPointerDown(axis)}
					onPointerMove={drag.onPointerMove}
					onPointerUp={drag.onPointerUp}
					onPointerOver={() => setHovered(axis)}
					onPointerOut={() => setHovered(null)}
				/>
			))}
		</>
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
const SHAFT_START = 0.16;
const SHAFT_END = 0.86;
const HEAD_LENGTH = 0.14;

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
				position={[0, (SHAFT_START + 1) / 2, 0]}
				userData={GIZMO_USER_DATA}
				{...events}
			>
				<cylinderGeometry args={[0.06, 0.06, 1 - SHAFT_START, 8]} />
				<meshBasicMaterial transparent opacity={0} depthWrite={false} />
			</mesh>
		</group>
	);
}

export type { HandleProps };
