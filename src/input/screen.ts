import { type Camera, Vector3 } from "three";
import type { Vec3 } from "@/geometry/vec";
import type { ScreenPoint } from "@/input/pointer";

type View = {
	camera: Camera;
	rect: { left: number; top: number; width: number; height: number };
	/** Moves the camera to `position`, looking at (and orbiting round) `target`. */
	aim: (position: Vec3, target: Vec3) => void;
};

/** The 3D view's camera and canvas rectangle, kept current by `ScreenProjection` in the scene. */
let view: View | null = null;

export const setScreenView = (next: View | null) => {
	view = next;
};

/** Where a world point appears in the window, or null if it's behind the camera or there's no view. */
export function toScreen(p: Vec3): ScreenPoint | null {
	if (!view) return null;
	const v = new Vector3(p.x, p.y, p.z).project(view.camera);
	if (v.z > 1) return null;
	const { left, top, width, height } = view.rect;
	return {
		x: left + ((v.x + 1) / 2) * width,
		y: top + ((1 - v.y) / 2) * height,
	};
}

/** Moves the camera to `position`, looking at `target` (e.g. to frame a piece). */
export const aimCamera = (position: Vec3, target: Vec3) =>
	view?.aim(position, target);
