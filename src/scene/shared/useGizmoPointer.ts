import type { ThreeEvent } from "@react-three/fiber";
import type { Ray as ThreeRay } from "three";
import type { Ray } from "@/geometry/rays";
import { useOrbitControls } from "@/scene/shared/useOrbitControls";

export const toRay = (r: ThreeRay): Ray => ({
	origin: { x: r.origin.x, y: r.origin.y, z: r.origin.z },
	direction: { x: r.direction.x, y: r.direction.y, z: r.direction.z },
});

/**
 * Pointer plumbing shared by gizmos: keeps receiving events while dragging off the handle,
 * and pauses camera navigation for the duration of the drag.
 */
export function useGizmoPointer() {
	const controls = useOrbitControls();

	const capture = (e: ThreeEvent<PointerEvent>) => {
		e.stopPropagation();
		(e.target as Element).setPointerCapture(e.pointerId);
		if (controls) controls.enabled = false;
	};

	const release = (e: ThreeEvent<PointerEvent>) => {
		(e.target as Element).releasePointerCapture(e.pointerId);
		if (controls) controls.enabled = true;
	};

	return { capture, release };
}
