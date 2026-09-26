import { useEffect } from "react";
import { useAppStore } from "@/state/store";

/**
 * Hover for one gizmo or resize handle, shared across all of them: the handle under the pointer
 * is `hovered`, and every other handle is `dim`. Clears itself if the handle disappears while
 * hovered (e.g. when a drag hides the other handles), so nothing stays dimmed.
 */
export function useGizmoHover(id: string) {
	const current = useAppStore((s) => s.gizmoHover);
	const setGizmoHover = useAppStore((s) => s.setGizmoHover);

	useEffect(
		() => () => {
			if (useAppStore.getState().gizmoHover === id) setGizmoHover(null);
		},
		[id, setGizmoHover],
	);

	return {
		hovered: current === id,
		dim: current !== null && current !== id,
		onPointerOver: () => setGizmoHover(id),
		onPointerOut: () => {
			if (useAppStore.getState().gizmoHover === id) setGizmoHover(null);
		},
	};
}
