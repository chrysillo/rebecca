import type { ScreenPoint } from "../input/pointer";
import type { PieceKind } from "../model/types";

/** Order of options on the create wheel. Adding a kind here adds a slice. */
export const CREATE_OPTIONS: readonly PieceKind[] = ["sheet", "framing"];

/** Fixed dimensions a new piece of each kind is created with; remembered between uses. */
export type Presets = {
	sheet: { thickness: number };
	framing: { width: number; depth: number };
};

/** Transient state of the open create wheel. */
export type CreatorState = {
	/** Wheel centre, in window pixels. */
	at: ScreenPoint;
	/** The option that will be created on confirm. Starts as the last one used. */
	highlighted: PieceKind;
	/** Characters typed to change the highlighted option's size (e.g. "12" or "45x90"). */
	typed: string;
	/** When the wheel opened, to tell "hold R and release" from "tap R". */
	openedAt: number;
};
