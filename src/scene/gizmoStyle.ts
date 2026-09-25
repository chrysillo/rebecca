import type { Axis } from "../geometry/vec";

export const AXIS_COLOR: Record<Axis, string> = {
	x: "#e03131",
	y: "#2f9e44",
	z: "#1971c2",
};
export const HOVER_COLOR = "#fab005";

/** Drawn after the scene and without depth testing, so gizmos are never hidden by pieces. */
export const GIZMO_RENDER_ORDER = 1000;
