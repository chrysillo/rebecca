import { Billboard } from "@react-three/drei";
import { type ThreeEvent, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import { type Vector2, Vector3 } from "three";
import { PIVOTS, selectionPivotPoint } from "@/geometry/pivot";
import type { Piece, Pivot } from "@/model/types";
import {
	GIZMO_RENDER_ORDER,
	GIZMO_USER_DATA,
	gizmoMaterialProps,
} from "@/scene/gizmoStyle";
import { ScreenSizeGroup } from "@/scene/ScreenSizeGroup";
import { useGizmoPointer } from "@/scene/useGizmoPointer";

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
 * The white dot at the gizmo's centre. Drag it and it snaps to whichever of the selection's
 * pivots (centre, and top/middle/bottom of each end) is nearest the mouse on screen; releasing makes that the rotation pivot (one undo step).
 */
export function PivotHandle({ pieces, current, onPreview, onCommit }: Props) {
	const camera = useThree((s) => s.camera);
	const pointer = useGizmoPointer();
	const snapped = useRef<Pivot | null>(null);
	const [hovered, setHovered] = useState(false);

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
			<mesh renderOrder={GIZMO_RENDER_ORDER}>
				<sphereGeometry args={[hovered ? 0.04 : 0.032, 16, 12]} />
				<meshBasicMaterial {...gizmoMaterialProps("#ffffff")} />
			</mesh>
			<mesh
				userData={GIZMO_USER_DATA}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerOver={() => setHovered(true)}
				onPointerOut={() => setHovered(false)}
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
						{...gizmoMaterialProps(pivot === active ? "#3b82f6" : "#6b7280")}
					/>
				</mesh>
			</Billboard>
		</ScreenSizeGroup>
	));
}
