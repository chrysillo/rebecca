import { useState } from "react";
import { DoubleSide } from "three";
import { AXIS_COLOR, HANDLE_HOVER_COLOR } from "@/colors";
import { AXES, type Axis } from "@/geometry/vec";
import type { HandleProps } from "@/scene/gizmo/MoveArrows";
import { RotationGuide } from "@/scene/gizmo/RotationGuide";
import type { CameraView } from "@/scene/gizmo/useCameraView";
import { useRotateDrag } from "@/scene/gizmo/useRotateDrag";
import {
	GIZMO_RENDER_ORDER,
	GIZMO_USER_DATA,
	gizmoMaterialProps,
	HANDLE_HIT_RADIUS,
	PLANE_ORIENTATION,
	ROTATE_RADIUS,
} from "@/scene/shared/gizmoStyle";
import { useAppStore } from "@/state/store";

/** Arc handles sit between the move arrows, like Shapr3D's curved rotate arrows. */
const ARC_RADIUS = ROTATE_RADIUS;
const ARC_SPAN = (18 * Math.PI) / 180;
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
const HEAD_LENGTH = 0.09;
/** Angle each arrowhead reaches past the end of its arc (head length plus a little slack). */
const HEAD_SPAN = (HEAD_LENGTH * 1.3) / ARC_RADIUS;

/**
 * One curved, double-headed arrow per axis. Dragging an arc turns the selection about that axis,
 * around the selection centre. Arcs sit in the quadrant facing the camera so they're never hidden behind the model.
 */
export function RotateArcs({ view }: { view: CameraView }) {
	const [hovered, setHovered] = useState<Axis | null>(null);
	const drag = useRotateDrag();
	// Guides show for the arc under the mouse, and stay for the whole drag.
	const draggingAxis = useAppStore((s) => s.drag?.rotation?.axis ?? null);
	const guideAxis = draggingAxis ?? hovered;
	const visible = AXES.filter((a) => !view.edgeOn.includes(a));

	return (
		<>
			{visible.map((axis) => (
				<RotationGuide key={axis} axis={axis} active={axis === guideAxis} />
			))}
			{/* Mirroring per world axis moves every arc into the camera-facing quadrant. */}
			<group scale={view.sides}>
				{visible.map((axis) => (
					<Arc
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
		</>
	);
}

/** A short arc (ARC_SPAN) with an arrowhead at each end, plus a fatter invisible hit area. */
function Arc({ axis, color, ...events }: HandleProps) {
	const start = ARC_MIDDLE[axis] - ARC_SPAN / 2;
	const end = start + ARC_SPAN;
	return (
		<group rotation={PLANE_ORIENTATION[axis]}>
			<group rotation={[0, 0, start]}>
				<mesh renderOrder={GIZMO_RENDER_ORDER}>
					<torusGeometry args={[ARC_RADIUS, 0.008, 8, 48, ARC_SPAN]} />
					<meshBasicMaterial {...gizmoMaterialProps(color)} />
				</mesh>
			</group>
			{/* Grab area covers the whole visible arrow, heads included. Double-sided because the
			    arcs sit in a mirrored group, which flips triangle winding for raycasts. */}
			<group rotation={[0, 0, start - HEAD_SPAN]}>
				<mesh userData={GIZMO_USER_DATA} {...events}>
					<torusGeometry
						args={[
							ARC_RADIUS,
							HANDLE_HIT_RADIUS,
							8,
							24,
							ARC_SPAN + 2 * HEAD_SPAN,
						]}
					/>
					<meshBasicMaterial
						transparent
						opacity={0}
						depthWrite={false}
						side={DoubleSide}
					/>
				</mesh>
			</group>
			<ArrowHead angle={end} color={color} />
			<ArrowHead angle={start} color={color} backwards />
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
