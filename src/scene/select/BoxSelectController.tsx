import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type { ScreenPoint } from "@/input/pointer";
import { isPressClaimed } from "@/scene/shared/pressClaim";
import { useAppStore } from "@/state/store";
import {
	finishBoxSelect,
	startBoxSelect,
	updateBoxSelect,
} from "@/tools/boxSelectSession";

/** Pointer travel (px) before a press on empty space becomes a selection box rather than a click. */
const DRAG_SLOP = 4;

/**
 * Left-drag from empty space (or from a piece that isn't selected) drags out a selection box.
 * Renders nothing; the box itself is drawn by the UI.
 */
export function BoxSelectController() {
	const canvas = useThree((s) => s.gl.domElement);

	useEffect(() => {
		let press: {
			at: ScreenPoint;
			shiftKey: boolean;
			altKey: boolean;
			/** Past the slop, so the box is showing (unless Escape has since dropped it). */
			started: boolean;
		} | null = null;

		// On window, in the bubble phase, so it runs after the scene's own handlers have had the
		// chance to claim the press (a gizmo handle, a selected piece, the view cube).
		const onDown = (e: PointerEvent) => {
			if (e.button !== 0 || e.target !== canvas || isPressClaimed(e)) return;
			press = {
				at: { x: e.clientX, y: e.clientY },
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				started: false,
			};
		};
		const onMove = (e: PointerEvent) => {
			if (!press) return;
			const at = { x: e.clientX, y: e.clientY };
			if (!press.started) {
				if (Math.hypot(at.x - press.at.x, at.y - press.at.y) < DRAG_SLOP)
					return;
				press.started = true;
				if (!startBoxSelect(press.at, press)) press = null;
			}
			// Also stops once Escape has dropped the box.
			if (!useAppStore.getState().boxSelect) press = null;
			else updateBoxSelect(at);
		};
		const onUp = () => {
			if (!press) return;
			press = null;
			finishBoxSelect();
		};

		window.addEventListener("pointerdown", onDown);
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		return () => {
			window.removeEventListener("pointerdown", onDown);
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};
	}, [canvas]);

	return null;
}
