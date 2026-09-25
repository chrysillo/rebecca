import type { ThreeEvent } from "@react-three/fiber";
import { useThree } from "@react-three/fiber";
import { useRef } from "react";
import { type PerspectiveCamera, Vector3 } from "three";
import { CONFIG } from "@/config";
import type { FacePlane } from "@/geometry/box";
import { closestParamOnAxis } from "@/geometry/rays";
import { type Axis, axisVector, type Vec3 } from "@/geometry/vec";
import { isHeld } from "@/input/modifiers";
import type { Id, Piece } from "@/model/types";
import { toRay, useGizmoPointer } from "@/scene/useGizmoPointer";
import { snapTargets } from "@/snapping/targets";
import { pixelsToMm } from "@/snapping/tolerance";
import { selectedPieces } from "@/state/selectors";
import { useAppStore } from "@/state/store";
import { commitDrag } from "@/tools/commitDrag";
import { computeMove } from "@/tools/moveTool";

type Session = {
	axis: Axis;
	origin: Vec3;
	startParam: number;
	pieces: Piece[];
	targets: FacePlane[];
};

/** Connects move-arrow pointer events to the move tool, previewing in the store until release. */
export function useMoveDrag(origin: Vec3) {
	const session = useRef<Session | null>(null);
	const camera = useThree((s) => s.camera) as PerspectiveCamera;
	const viewportHeight = useThree((s) => s.size.height);
	const pointer = useGizmoPointer();

	const onPointerDown = (axis: Axis) => (e: ThreeEvent<PointerEvent>) => {
		if (e.button !== 0) return;
		const startParam = closestParamOnAxis(
			toRay(e.ray),
			origin,
			axisVector(axis),
		);
		if (startParam === null) return;
		pointer.capture(e);

		const { doc, setDrag } = useAppStore.getState();
		const pieces = selectedPieces(doc);
		const duplicate = isHeld("duplicate", e);
		// A copy may snap to its own original; a moved piece may not snap to itself.
		const exclude = new Set<Id>(duplicate ? [] : doc.selection);
		session.current = {
			axis,
			origin,
			startParam,
			pieces,
			targets: snapTargets(Object.values(doc.pieces), exclude),
		};
		setDrag({
			preview: Object.fromEntries(
				pieces.map((p) => [
					p.id,
					{ position: p.position, rotation: p.rotation },
				]),
			),
			duplicate,
			snapTarget: null,
			rotation: null,
			moveAxis: axis,
		});
	};

	const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
		const s = session.current;
		const { drag, setDrag } = useAppStore.getState();
		if (!s || !drag) return;
		const param = closestParamOnAxis(
			toRay(e.ray),
			s.origin,
			axisVector(s.axis),
		);
		if (param === null) return;

		const cameraDistance = camera.position.distanceTo(
			new Vector3(s.origin.x, s.origin.y, s.origin.z),
		);
		const result = computeMove({
			pieces: s.pieces,
			targets: s.targets,
			axis: s.axis,
			distance: param - s.startParam,
			fine: isHeld("fine", e),
			tolerance: pixelsToMm(
				CONFIG.move.snapPixels,
				cameraDistance,
				camera.fov,
				viewportHeight,
			),
		});
		setDrag({
			...drag,
			preview: result.transforms,
			snapTarget: result.snapTarget,
		});
	};

	const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
		if (!session.current) return;
		pointer.release(e);
		session.current = null;
		commitDrag();
	};

	return { onPointerDown, onPointerMove, onPointerUp };
}
