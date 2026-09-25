import type { Axis } from "@/geometry/vec";
import type { PieceKind } from "@/model/types";

/**
 * Colours used by more than one file, in the 3D view or the panels. A colour only one file uses
 * stays a named constant at the top of that file.
 */

/** Each kind of piece's wood colour: the pieces in the 3D view, the swatches in the panels. */
export const WOOD_COLOR: Record<PieceKind, string> = {
	sheet: "#dcc196",
	framing: "#c99a63",
};

/** Gizmo arrows and arcs: softer axis colours, Shapr3D style. */
export const AXIS_COLOR: Record<Axis, string> = {
	x: "#e5484d",
	y: "#30a46c",
	z: "#3e63dd",
};

/** The floor's axis lines and the view cube's axis stubs: paler than the gizmo, so they recede. */
export const FLOOR_AXIS_COLOR: Record<Axis, string> = {
	x: "#df7468",
	y: "#5fae74",
	z: "#5b8fd6",
};

/** A gizmo handle under the pointer or being dragged. */
export const HANDLE_HOVER_COLOR = "#ffb224";

/** Selected faces, the extrude arrow, the active pivot, the view cube face under the pointer. */
export const SELECTION_COLOR = "#3b82f6";

/** The face being snapped to (outline and tint), during a drag or extrude. */
export const SNAP_COLOR = "#e8590c";

/** Saved dimensions, on screen and on the exported sheet. */
export const MEASURE_COLOR = "#0f766e";
