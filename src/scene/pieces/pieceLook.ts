import { Color } from "three";
import { WOOD_COLOR } from "@/colors";
import type { PieceKind } from "@/model/types";

const tinted = (tint: string, amount: number) => ({
	sheet: new Color(WOOD_COLOR.sheet).lerp(new Color(tint), amount),
	framing: new Color(WOOD_COLOR.framing).lerp(new Color(tint), amount),
});

const EDGE = "#5c4a32";

/** Selected pieces keep their wood colour under a light amber tint, outlined in the UI's amber accent. */
const SELECTED_TINT = "#fcd34d";
const SELECTED_FILL = tinted(SELECTED_TINT, 0.35);
const SELECTED_EDGE = "#f59e0b";

/** Under the pointer (or its right-click menu open): lifted towards white, with a darker amber edge. */
const HOVER_TINT = "#fff7e6";
const HOVER_FILL = tinted(HOVER_TINT, 0.35);
const HOVER_SELECTED_FILL = {
	sheet: SELECTED_FILL.sheet.clone().lerp(new Color(HOVER_TINT), 0.3),
	framing: SELECTED_FILL.framing.clone().lerp(new Color(HOVER_TINT), 0.3),
};
const HOVER_EDGE = "#d97706";

/** Join wheel preview: the piece to be cut glows amber; the pieces cutting it (pulled clear) are faded. */
const JOIN_TARGET_FILL = tinted("#f5a524", 0.65);
const JOIN_TARGET_EDGE = "#b45309";
const JOIN_TOOL_EDGE = "#8a7a64";
const JOIN_TOOL_OPACITY = 0.4;

/** The copies following the pointer during a duplicate-drag are see-through. */
const GHOST_OPACITY = 0.6;

export type PieceState = {
	selected: boolean;
	/** Under the pointer, or the piece a right-click menu is open for. */
	hovered: boolean;
	ghost: boolean;
	joinRole?: "target" | "tool";
};

export type PieceLook = {
	fill: Color | string;
	edge: string;
	edgeWidth: number;
	opacity: number;
	/** See-through: drawn transparent and without writing depth. */
	seeThrough: boolean;
};

/** How a piece is drawn in each state. The join preview overrides selection and hover. */
export function pieceLook(
	kind: PieceKind,
	{ selected, hovered, ghost, joinRole }: PieceState,
): PieceLook {
	const seeThrough = ghost || joinRole === "tool";
	const opacity =
		joinRole === "tool" ? JOIN_TOOL_OPACITY : ghost ? GHOST_OPACITY : 1;
	if (joinRole === "target")
		return {
			fill: JOIN_TARGET_FILL[kind],
			edge: JOIN_TARGET_EDGE,
			edgeWidth: 2.5,
			opacity,
			seeThrough,
		};
	if (joinRole === "tool")
		return {
			fill: WOOD_COLOR[kind],
			edge: JOIN_TOOL_EDGE,
			edgeWidth: 1,
			opacity,
			seeThrough,
		};
	const fill = hovered
		? selected
			? HOVER_SELECTED_FILL[kind]
			: HOVER_FILL[kind]
		: selected
			? SELECTED_FILL[kind]
			: WOOD_COLOR[kind];
	return {
		fill,
		edge: selected ? SELECTED_EDGE : hovered ? HOVER_EDGE : EDGE,
		edgeWidth: selected ? 2.5 : hovered ? 2 : 1,
		opacity,
		seeThrough,
	};
}
