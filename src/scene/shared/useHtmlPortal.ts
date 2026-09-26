import { useThree } from "@react-three/fiber";
import { useRef } from "react";

/**
 * A stable `portal` target for drei's `<Html>`. Left to its default, `<Html>` targets
 * `events.connected`, which starts `undefined` and only resolves to the canvas's parent node once
 * R3F's event manager connects (a tick after mount) — a change `<Html>` reacts to by tearing down
 * and recreating its own ReactDOM root. That's harmless for one label, but when several `<Html>`s
 * mount together (e.g. saved measurements), the redo's `root.render()` calls race and one can lose:
 * its wrapper div stays attached but permanently empty (a dimension line with no number). Passing
 * the canvas's parent directly, unconditionally, skips that connect-driven remount entirely.
 */
export function useHtmlPortal(): React.RefObject<HTMLElement> {
	const parent = useThree(
		(s) => s.gl.domElement.parentNode as HTMLElement | null,
	);
	const ref = useRef<HTMLElement | null>(null);
	ref.current = parent;
	return ref as React.RefObject<HTMLElement>;
}
