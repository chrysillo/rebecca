import type { ScreenPoint } from "@/input/pointer";
import type { Id } from "@/model/types";

/** Transient state of a box being dragged out over empty space to select pieces. */
export type BoxSelectState = {
	/** Where the drag started and where the pointer is now, in window pixels. */
	start: ScreenPoint;
	end: ScreenPoint;
	/** Shift: add to the selection rather than replace it. */
	additive: boolean;
	/** Alt: pick pieces inside groups on their own, not their whole group. */
	single: boolean;
	/** The pieces the box would select if released now, shown lit. */
	hits: Id[];
};
