import { events as pointerEvents } from "@react-three/fiber";
import { isGizmoObject } from "@/scene/gizmoStyle";

/**
 * R3F's normal pointer events, but gizmo handles always come first: they're drawn on top of
 * everything, so they must also win the click even when a piece is physically nearer the camera.
 * Otherwise hits stay in distance order (the sort is stable).
 */
export const gizmoFirstEvents: typeof pointerEvents = (store) => ({
	...pointerEvents(store),
	filter: (items) =>
		[...items].sort(
			(a, b) =>
				Number(isGizmoObject(b.object)) - Number(isGizmoObject(a.object)),
		),
});
