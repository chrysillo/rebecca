import type { ThreeEvent } from "@react-three/fiber";
import { useState } from "react";
import { useGizmoPointer } from "@/scene/shared/useGizmoPointer";
import { confirmExtrude } from "@/tools/extrudeSession";

/**
 * Press-drag-release extruding from a handle. `start` begins the extrude and says whether it did;
 * the drag itself is then tracked by the ExtrudeController, exactly as with E, so snapping,
 * the readout and typed distances all work the same. Releasing applies it.
 */
export function useExtrudeDrag(start: () => boolean) {
	const [dragging, setDragging] = useState(false);
	const pointer = useGizmoPointer();

	const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
		if (e.button !== 0) return;
		pointer.capture(e);
		if (!start()) {
			pointer.release(e);
			return;
		}
		setDragging(true);
	};
	const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
		if (!dragging) return;
		pointer.release(e);
		setDragging(false);
		confirmExtrude();
	};

	return { dragging, onPointerDown, onPointerUp };
}
