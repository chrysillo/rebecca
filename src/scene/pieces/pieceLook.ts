import { Color } from "three";

/** The piece's own colour moved `amount` of the way towards `tint`. */
const tinted = (base: string, tint: string, amount: number) =>
	new Color(base).lerp(new Color(tint), amount);

const EDGE = "#5c4a32";

/** Selected pieces keep their wood colour under a light amber tint, outlined in the UI's amber accent. */
const SELECTED_TINT = "#fcd34d";
const SELECTED_EDGE = "#f59e0b";

/** Under the pointer (or its right-click menu open): lifted towards white, with a darker amber edge. */
const HOVER_TINT = "#fff7e6";
const HOVER_EDGE = "#d97706";

/**
 * Join wheel preview: the piece to be cut glows amber. The pieces cutting it are nearly see-through
 * and faintly hatched, so they read as hidden to show the cut rather than as part of it.
 */
const JOIN_TARGET_TINT = "#f5a524";
const JOIN_TARGET_EDGE = "#b45309";
const JOIN_TOOL_EDGE = "#8a7a64";
const JOIN_TOOL_OPACITY = 0.15;

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
	/** Faint diagonal hatching across the faces. */
	hatched: boolean;
};

/**
 * How a piece is drawn in each state, starting from its own colour (`base`, from its stock).
 * The join preview overrides selection and hover.
 */
export function pieceLook(
	base: string,
	{ selected, hovered, ghost, joinRole }: PieceState,
): PieceLook {
	const seeThrough = ghost || joinRole === "tool";
	const hatched = joinRole === "tool";
	const opacity =
		joinRole === "tool" ? JOIN_TOOL_OPACITY : ghost ? GHOST_OPACITY : 1;
	if (joinRole === "target")
		return {
			fill: tinted(base, JOIN_TARGET_TINT, 0.65),
			edge: JOIN_TARGET_EDGE,
			edgeWidth: 2.5,
			opacity,
			seeThrough,
			hatched,
		};
	if (joinRole === "tool")
		return {
			fill: base,
			edge: JOIN_TOOL_EDGE,
			edgeWidth: 1,
			opacity,
			seeThrough,
			hatched,
		};
	const selectedFill = tinted(base, SELECTED_TINT, 0.35);
	const fill = hovered
		? selected
			? selectedFill.lerp(new Color(HOVER_TINT), 0.3)
			: tinted(base, HOVER_TINT, 0.35)
		: selected
			? selectedFill
			: base;
	return {
		fill,
		edge: selected ? SELECTED_EDGE : hovered ? HOVER_EDGE : EDGE,
		edgeWidth: selected ? 2.5 : hovered ? 2 : 1,
		opacity,
		seeThrough,
		hatched,
	};
}
