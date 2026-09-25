import { useFrame } from "@react-three/fiber";
import { useState } from "react";
import { Vector3 } from "three";
import { AXES, type Axis, type Vec3 } from "../geometry/vec";
import {
	AXIS_COLOR,
	GIZMO_RENDER_ORDER,
	GIZMO_USER_DATA,
	gizmoMaterialProps,
	HOVER_COLOR,
	PLANE_ORIENTATION,
} from "./gizmoStyle";
import type { HandleProps } from "./MoveArrows";
import { useRotateDrag } from "./useRotateDrag";

/** Arc handles sit between the move arrows, like Shapr3D's curved rotate arrows. */
const ARC_RADIUS = 0.85;
const ARC_SPAN = (30 * Math.PI) / 180;
const ARC_START = Math.PI / 4 - ARC_SPAN / 2;
const HEAD_LENGTH = 0.09;

/** Below this |cos| between view direction and an arc's axis, the arc is edge-on: hidden, as it can't be dragged. */
const EDGE_ON = 0.12;

type Sides = [number, number, number];

/**
 * One curved, double-headed arrow per axis. Dragging an arc turns the selection about that axis,
 * around the selection centre. Arcs sit in the quadrant facing the camera so they're never hidden behind the model.
 */
export function RotateArcs({ origin }: { origin: Vec3 }) {
	const [hovered, setHovered] = useState<Axis | null>(null);
	const [view, setView] = useState<{ sides: Sides; edgeOn: Axis[] }>({
		sides: [1, 1, 1],
		edgeOn: [],
	});
	const drag = useRotateDrag();

	useFrame(({ camera }) => {
		const centre = new Vector3(origin.x, origin.y, origin.z);
		const dir = camera.position.clone().sub(centre).normalize();
		const sides: Sides = [
			Math.sign(dir.x) || 1,
			Math.sign(dir.y) || 1,
			Math.sign(dir.z) || 1,
		];
		const edgeOn = AXES.filter((a) => Math.abs(dir[a]) < EDGE_ON);
		if (
			sides.join() !== view.sides.join() ||
			edgeOn.join() !== view.edgeOn.join()
		)
			setView({ sides, edgeOn });
	});

	return (
		// Mirroring per world axis moves every arc into the camera-facing quadrant.
		<group scale={view.sides}>
			{AXES.filter((a) => !view.edgeOn.includes(a)).map((axis) => (
				<Arc
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
		</group>
	);
}

/** A short arc (ARC_SPAN) with an arrowhead at each end, plus a fatter invisible hit area. */
function Arc({ axis, color, ...events }: HandleProps) {
	const end = ARC_START + ARC_SPAN;
	return (
		<group rotation={PLANE_ORIENTATION[axis]}>
			<group rotation={[0, 0, ARC_START]}>
				<mesh renderOrder={GIZMO_RENDER_ORDER}>
					<torusGeometry args={[ARC_RADIUS, 0.008, 8, 48, ARC_SPAN]} />
					<meshBasicMaterial {...gizmoMaterialProps(color)} />
				</mesh>
				<mesh userData={GIZMO_USER_DATA} {...events}>
					<torusGeometry args={[ARC_RADIUS, 0.06, 8, 24, ARC_SPAN]} />
					<meshBasicMaterial transparent opacity={0} depthWrite={false} />
				</mesh>
			</group>
			<ArrowHead angle={end} color={color} />
			<ArrowHead angle={ARC_START} color={color} backwards />
		</group>
	);
}

/** A cone at a point on the arc, pointing along the arc (tangent). */
function ArrowHead({
	angle,
	color,
	backwards = false,
}: {
	angle: number;
	color: string;
	backwards?: boolean;
}) {
	// Nudge the head past the end of the arc so its base sits on the arc's tip.
	const along = backwards ? -1 : 1;
	const a = angle + (along * HEAD_LENGTH) / (2 * ARC_RADIUS);
	return (
		<mesh
			position={[ARC_RADIUS * Math.cos(a), ARC_RADIUS * Math.sin(a), 0]}
			// A cone points along +Y; turning it by the angle points it along the tangent.
			rotation={[0, 0, a + (backwards ? Math.PI : 0)]}
			renderOrder={GIZMO_RENDER_ORDER}
		>
			<coneGeometry args={[0.032, HEAD_LENGTH, 16]} />
			<meshBasicMaterial {...gizmoMaterialProps(color)} />
		</mesh>
	);
}
