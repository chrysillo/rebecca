import { useFrame } from "@react-three/fiber";
import { useState } from "react";
import { Vector3 } from "three";
import { AXES, type Axis, type Vec3 } from "../geometry/vec";
import { AXIS_COLOR, GIZMO_RENDER_ORDER, HOVER_COLOR } from "./gizmoStyle";
import type { HandleProps } from "./MoveArrows";
import { useRotateDrag } from "./useRotateDrag";

/** Rings sit just outside the move arrows (length 1) so their handles never overlap. */
const RING_RADIUS = 1.15;

/** Below this |cos| between view direction and ring axis, the ring is edge-on: hidden, as it can't be dragged. */
const EDGE_ON = 0.2;

/** Ring rotations: a torus lies in the XY plane (around Z) by default. */
const RING_ROTATION: Record<Axis, [number, number, number]> = {
	x: [0, Math.PI / 2, 0],
	y: [Math.PI / 2, 0, 0],
	z: [0, 0, 0],
};

/** X/Y/Z rings. Dragging a ring turns the selection about that axis, around the selection centre. */
export function RotateRings({ origin }: { origin: Vec3 }) {
	const [hovered, setHovered] = useState<Axis | null>(null);
	const [edgeOn, setEdgeOn] = useState<Axis[]>([]);
	const drag = useRotateDrag();

	useFrame(({ camera }) => {
		const centre = new Vector3(origin.x, origin.y, origin.z);
		const view = camera.position.clone().sub(centre).normalize();
		const next = AXES.filter((a) => Math.abs(view[a]) < EDGE_ON);
		if (next.join() !== edgeOn.join()) setEdgeOn(next);
	});

	return (
		<>
			{AXES.filter((a) => !edgeOn.includes(a)).map((axis) => (
				<Ring
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

/** One ring, drawn on top of everything, with a fatter invisible hit area. */
function Ring({ axis, color, ...events }: HandleProps) {
	return (
		<group rotation={RING_ROTATION[axis]}>
			<mesh renderOrder={GIZMO_RENDER_ORDER}>
				<torusGeometry args={[RING_RADIUS, 0.012, 8, 96]} />
				<meshBasicMaterial color={color} depthTest={false} toneMapped={false} />
			</mesh>
			<mesh {...events}>
				<torusGeometry args={[RING_RADIUS, 0.06, 8, 48]} />
				<meshBasicMaterial transparent opacity={0} depthWrite={false} />
			</mesh>
		</group>
	);
}
