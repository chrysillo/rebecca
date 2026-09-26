import { DoubleSide } from "three";
import { AXIS_COLOR, HANDLE_HOVER_COLOR } from "@/colors";
import { AXES, type Axis } from "@/geometry/vec";
import type { HandleEvents } from "@/scene/gizmo/MoveArrows";
import { RotationGuide } from "@/scene/gizmo/RotationGuide";
import type { CameraView } from "@/scene/gizmo/useCameraView";
import { useRotateDrag } from "@/scene/gizmo/useRotateDrag";
import { SolidArc } from "@/scene/shared/gizmoShapes";
import {
	DIM_OPACITY,
	GIZMO_USER_DATA,
	HANDLE_HIT_RADIUS,
	PLANE_ORIENTATION,
	ROTATE_RADIUS,
} from "@/scene/shared/gizmoStyle";
import { useGizmoHover } from "@/scene/shared/useGizmoHover";
import { useAppStore } from "@/state/store";

/** Arc handles sit on the guide rings, between the move arrows. Tips included. */
const ARC_SPAN = (30 * Math.PI) / 180;
/**
 * Where each arc sits in its plane, as the angle of its middle (before the camera-facing mirror).
 * Chosen by eye so the three arcs spread around the gizmo instead of bunching up:
 * X between its two arrows; Y on the upper side, away from X; Z opposite. Nothing sits below the piece.
 */
const ARC_MIDDLE: Record<Axis, number> = {
	x: Math.PI / 4,
	y: -Math.PI / 4,
	z: -Math.PI / 4,
};

/**
 * One curved, double-headed arrow per axis. Dragging an arc turns the selection about that axis,
 * around the selection centre. Arcs sit in the quadrant facing the camera so they're never hidden behind the model.
 */
export function RotateArcs({ view }: { view: CameraView }) {
	const drag = useRotateDrag();
	const hovered = useAppStore((s) => s.gizmoHover);
	// A ring lights up for the arc under the mouse, and stays lit for the whole drag.
	const draggingAxis = useAppStore((s) => s.drag?.rotation?.axis ?? null);
	const visible = AXES.filter((a) => !view.edgeOn.includes(a));

	return (
		<>
			{AXES.map((axis) => (
				<RotationGuide
					key={axis}
					axis={axis}
					active={axis === draggingAxis || hovered === `rotate:${axis}`}
				/>
			))}
			{/* Mirroring per world axis moves every arc into the camera-facing quadrant. */}
			<group scale={view.sides}>
				{visible.map((axis) => (
					<Arc
						key={axis}
						axis={axis}
						onPointerDown={drag.onPointerDown(axis)}
						onPointerMove={drag.onPointerMove}
						onPointerUp={drag.onPointerUp}
					/>
				))}
			</group>
		</>
	);
}

/** A solid double-headed arc, plus a fatter invisible hit area over the whole of it. */
function Arc({ axis, ...events }: HandleEvents & { axis: Axis }) {
	const hover = useGizmoHover(`rotate:${axis}`);
	const start = ARC_MIDDLE[axis] - ARC_SPAN / 2;
	return (
		<group rotation={PLANE_ORIENTATION[axis]}>
			<SolidArc
				radius={ROTATE_RADIUS}
				start={start}
				span={ARC_SPAN}
				color={hover.hovered ? HANDLE_HOVER_COLOR : AXIS_COLOR[axis]}
				opacity={hover.dim ? DIM_OPACITY : 1}
			/>
			{/* Double-sided because the arcs sit in a mirrored group, which flips triangle winding for raycasts. */}
			<group rotation={[0, 0, start]}>
				<mesh
					userData={GIZMO_USER_DATA}
					onPointerOver={hover.onPointerOver}
					onPointerOut={hover.onPointerOut}
					{...events}
				>
					<torusGeometry
						args={[ROTATE_RADIUS, HANDLE_HIT_RADIUS, 8, 24, ARC_SPAN]}
					/>
					<meshBasicMaterial
						transparent
						opacity={0}
						depthWrite={false}
						side={DoubleSide}
					/>
				</mesh>
			</group>
		</group>
	);
}
