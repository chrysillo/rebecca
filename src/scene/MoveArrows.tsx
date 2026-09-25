import type { ThreeEvent } from "@react-three/fiber";
import { useState } from "react";
import { AXES, type Axis, type Vec3 } from "../geometry/vec";
import { AXIS_COLOR, GIZMO_RENDER_ORDER, HOVER_COLOR } from "./gizmoStyle";
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

/** One arrow, drawn on top of everything, with a fatter invisible hit area. */
function Arrow({ axis, color, ...events }: HandleProps) {
	const material = (
		<meshBasicMaterial color={color} depthTest={false} toneMapped={false} />
	);
	return (
		<group rotation={ARROW_ROTATION[axis]}>
			<mesh position={[0, 0.4, 0]} renderOrder={GIZMO_RENDER_ORDER}>
				<cylinderGeometry args={[0.012, 0.012, 0.8, 8]} />
				{material}
			</mesh>
			<mesh position={[0, 0.9, 0]} renderOrder={GIZMO_RENDER_ORDER}>
				<coneGeometry args={[0.05, 0.2, 16]} />
				{material}
			</mesh>
			<mesh position={[0, 0.55, 0]} {...events}>
				<cylinderGeometry args={[0.07, 0.07, 0.9, 8]} />
				<meshBasicMaterial transparent opacity={0} depthWrite={false} />
			</mesh>
		</group>
	);
}

export type { HandleProps };
