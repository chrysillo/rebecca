import { Billboard } from "@react-three/drei";
import { type ThreeEvent, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { type Vector2, Vector3 } from "three";
import { SELECTION_COLOR } from "@/colors";
import { PIVOTS, selectionPivotPoint } from "@/geometry/pivot";
import type { Piece, Pivot } from "@/model/types";
import { GizmoDisc } from "@/scene/shared/gizmoShapes";
import {
	DIM_OPACITY,
	GIZMO_RENDER_ORDER,
	GIZMO_USER_DATA,
	gizmoMaterialProps,
} from "@/scene/shared/gizmoStyle";
import { ScreenSizeGroup } from "@/scene/shared/ScreenSizeGroup";
import { useGizmoHover } from "@/scene/shared/useGizmoHover";
import { useGizmoPointer } from "@/scene/shared/useGizmoPointer";

/** The draggable pivot dot: a white disc with a dark centre that turns amber under the pointer. */
const DISC_RADIUS = 0.055;
const DOT_RADIUS = 0.021;
const DOT_COLOR = "#262626";
const DOT_HOVER_COLOR = "#f59e0b";
/** Pivot targets shown while dragging the dot; the one it will snap to uses the selection colour. */
const TARGET_COLOR = "#6b7280";

type Props = {
	/** The selected piece(s): one piece uses its own frame, several use the box around them. */
	pieces: Piece[];
	/** The pivot in use now. */
	current: Pivot;
	/** Reports the pivot the dot is snapped to while dragging, or null when the drag ends. */
	onPreview: (pivot: Pivot | null) => void;
	/** Makes the snapped pivot the real one (one undo step). */
	onCommit: (pivot: Pivot) => void;
};

/**
 * The dot at the gizmo's centre. Drag it and it snaps to whichever of the selection's
 * pivots (centre, and top/middle/bottom of each end) is nearest the mouse on screen; releasing makes that the rotation pivot (one undo step).
 */
export function PivotHandle({ pieces, current, onPreview, onCommit }: Props) {
	const camera = useThree((s) => s.camera);
	const pointer = useGizmoPointer();
	const snapped = useRef<Pivot | null>(null);
	const hover = useGizmoHover("pivot");

	const nearestPivot = (ndc: Vector2): Pivot => {
		let best: Pivot = current;
		let bestDistance = Number.POSITIVE_INFINITY;
		for (const pivot of PIVOTS) {
			const p = selectionPivotPoint(pieces, pivot);
			const screen = new Vector3(p.x, p.y, p.z).project(camera);
			const d = Math.hypot(screen.x - ndc.x, screen.y - ndc.y);
			if (d < bestDistance) [best, bestDistance] = [pivot, d];
		}
		return best;
	};

	const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
		if (e.button !== 0) return;
		pointer.capture(e);
		snapped.current = current;
		onPreview(current);
	};

	const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
		if (snapped.current === null) return;
		const next = nearestPivot(e.pointer);
		if (next !== snapped.current) {
			snapped.current = next;
			onPreview(next);
		}
	};

	const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
		if (snapped.current === null) return;
		pointer.release(e);
		onCommit(snapped.current);
		snapped.current = null;
		onPreview(null);
	};

	return (
		<group>
			<GizmoDisc
				radius={DISC_RADIUS}
				dotRadius={DOT_RADIUS}
				color={hover.hovered ? DOT_HOVER_COLOR : DOT_COLOR}
				opacity={hover.dim ? DIM_OPACITY : 1}
			/>
			<mesh
				userData={GIZMO_USER_DATA}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerOver={hover.onPointerOver}
				onPointerOut={hover.onPointerOut}
			>
				<sphereGeometry args={[0.08, 12, 8]} />
				<meshBasicMaterial transparent opacity={0} depthWrite={false} />
			</mesh>
		</group>
	);
}

/** While dragging the pivot: a marker at each pivot position, the snapped one highlighted. */
export function PivotTargets({
	pieces,
	active,
}: {
	pieces: Piece[];
	active: Pivot;
}) {
	return PIVOTS.map((pivot) => (
		<ScreenSizeGroup key={pivot} position={selectionPivotPoint(pieces, pivot)}>
			{/* Always faces the camera, so each target reads as a round ring. */}
			<Billboard>
				<mesh renderOrder={GIZMO_RENDER_ORDER - 1}>
					<ringGeometry args={[0.045, 0.065, 24]} />
					<meshBasicMaterial
						{...gizmoMaterialProps(
							pivot === active ? SELECTION_COLOR : TARGET_COLOR,
						)}
					/>
				</mesh>
			</Billboard>
		</ScreenSizeGroup>
	));
}
