import { useEffect } from "react";

export type ScreenPoint = { x: number; y: number };

let last: ScreenPoint =
	typeof window === "undefined"
		? { x: 0, y: 0 }
		: { x: window.innerWidth / 2, y: window.innerHeight / 2 };

/** Where the mouse was last seen, in window pixels. Lets keyboard actions open things at the cursor. */
export const lastPointer = (): ScreenPoint => last;

/** Mount once, at the app root, to keep `lastPointer` current. */
export function usePointerTracking() {
	useEffect(() => {
		const onMove = (e: PointerEvent) => {
			last = { x: e.clientX, y: e.clientY };
		};
		window.addEventListener("pointermove", onMove);
		return () => window.removeEventListener("pointermove", onMove);
	}, []);
}
