import { useFrame } from "@react-three/fiber";
import { useState } from "react";
import { Vector3 } from "three";
import { AXES, type Axis, type Vec3 } from "@/geometry/vec";

/** Which side of the gizmo the camera is on, per world axis (+1 / −1). */
export type Sides = [number, number, number];

export type CameraView = {
	/** Handles flip to these sides so they face the camera. */
	sides: Sides;
	/** Axes whose rotation plane is seen edge-on (its arc can't be dragged). */
	edgeOn: Axis[];
	/** Axes pointing (almost) straight at the camera (their move arrow is just a dot). */
	headOn: Axis[];
};

/** Below this |cos| between view direction and an axis, that axis's rotation plane is edge-on. */
const EDGE_ON = 0.12;
/** Above this |cos|, an axis points at the camera. */
const HEAD_ON = 0.97;
/** Dead zone before flipping a side, so handles don't flicker in straight-on views. */
const SIDE_SWITCH = 0.05;

const same = (a: CameraView, b: CameraView) =>
	a.sides.join() === b.sides.join() &&
	a.edgeOn.join() === b.edgeOn.join() &&
	a.headOn.join() === b.headOn.join();

/**
 * Tracks where the camera is relative to the gizmo, like Shapr3D's gizmo: handles face the viewer
 * as you orbit. Only re-renders when a side or visibility actually changes.
 */
export function useCameraView(origin: Vec3 | null): CameraView {
	const [view, setView] = useState<CameraView>({
		sides: [1, 1, 1],
		edgeOn: [],
		headOn: [],
	});

	useFrame(({ camera }) => {
		if (!origin) return;
		const dir = camera.position
			.clone()
			.sub(new Vector3(origin.x, origin.y, origin.z))
			.normalize();
		const side = (v: number, current: number) =>
			Math.abs(v) > SIDE_SWITCH ? Math.sign(v) : current;
		const next: CameraView = {
			sides: [
				side(dir.x, view.sides[0]),
				side(dir.y, view.sides[1]),
				side(dir.z, view.sides[2]),
			],
			edgeOn: AXES.filter((a) => Math.abs(dir[a]) < EDGE_ON),
			headOn: AXES.filter((a) => Math.abs(dir[a]) > HEAD_ON),
		};
		if (!same(next, view)) setView(next);
	});

	return view;
}
