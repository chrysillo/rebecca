import type { ScreenPoint } from "@/input/pointer";
import type { Id } from "@/model/types";

/** Transient state of the open create wheel. Its options are the project's stock entries. */
export type CreatorState = {
	/** Wheel centre, in window pixels. */
	at: ScreenPoint;
	/** Stock entry that will be created on confirm. Starts as the last one used. */
	highlighted: Id;
	/** Characters typed for a different size of the highlighted kind (e.g. "12" or "45x90"). */
	typed: string;
	/** When the wheel opened, to tell "hold R and release" from "tap R". */
	/** `performance.now()` when the wheel opened (same clock as event timestamps). */
	openedAt: number;
};
