/** Tunable numbers in one place. All lengths are millimetres. */
export const CONFIG = {
	defaults: {
		sheet: { length: 1200, width: 600, thickness: 18 },
		framing: { length: 1000, width: 38, depth: 63 },
	},
	move: {
		/** Step used when no snap target is in range. */
		step: 10,
		/** Step used while the fine modifier is held (object snapping is off). */
		fineStep: 1,
		/** How close, in screen pixels, a face must be to snap. */
		snapPixels: 12,
	},
	rotate: {
		step: 45,
		fineStep: 5,
	},
} as const;
