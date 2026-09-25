import type { ScreenPoint } from "@/input/pointer";
import type { Id } from "@/model/types";

/** Transient state of the open join wheel. Each option is a piece that could be cut. */
export type JoinerState = {
	/** Wheel centre, in window pixels. */
	at: ScreenPoint;
	/** Selected pieces that overlap another selected piece. */
	options: Id[];
	/** The piece that will be cut on confirm. Starts as the largest. */
	highlighted: Id;
	/** `performance.now()` when the wheel opened (same clock as event timestamps). */
	openedAt: number;
};
