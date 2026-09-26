import { Vector3 } from "three";

/**
 * Faces in BoxGeometry material order (+X, -X, +Y, -Y, +Z, -Z of the cube mesh), with the
 * world direction the camera moves to. Looking straight down/up is singular for orbit
 * controls, so Top/Bottom lean a hair toward Front.
 */
export const FACES = [
	{ label: "Right", view: new Vector3(1, 0, 0) },
	{ label: "Left", view: new Vector3(-1, 0, 0) },
	{ label: "Top", view: new Vector3(0, -1e-4, 1).normalize() },
	{ label: "Bottom", view: new Vector3(0, -1e-4, -1).normalize() },
	{ label: "Front", view: new Vector3(0, -1, 0) },
	{ label: "Back", view: new Vector3(0, 1, 0) },
] as const;

/** The view cube's move-camera function, registered by `ViewCube` while the 3D view is mounted. */
let lookFrom: ((view: Vector3) => void) | null = null;

/** Registers the view cube's look-from function; returns the unregister function (an effect cleanup). */
export function registerLookFrom(fn: (view: Vector3) => void) {
	lookFrom = fn;
	return () => {
		if (lookFrom === fn) lookFrom = null;
	};
}

/** Turns the camera to a standard view, as if the matching ViewCube face were clicked. */
export function viewFace(label: (typeof FACES)[number]["label"]) {
	const face = FACES.find((f) => f.label === label);
	if (face) lookFrom?.(face.view);
}
