import { Euler, Matrix4, Vector3 } from "three";
import type { Axis } from "@/geometry/vec";

/** Radius (gizmo units; move arrows are 1 long) of the rotate handles and their guide circle. */
export const ROTATE_RADIUS = 0.85;

/** How far the move/rotate gizmo reaches from its centre (gizmo units, arrow tips and grab areas included). */
export const GIZMO_REACH = 1.1;

/** Drawn after the scene and without depth testing, so gizmos are never hidden by pieces. */
export const GIZMO_RENDER_ORDER = 1000;

/**
 * Radius of the invisible grab areas around arrows and arcs (gizmo units, ~13 px on screen).
 * Generous, so a slightly-off press still grabs the handle instead of clicking the piece behind it.
 */
export const HANDLE_HIT_RADIUS = 0.1;

/** Tag put on gizmo hit areas so clicks that land on a handle don't also select what's behind it. */
export const GIZMO_USER_DATA = { gizmo: true } as const;

export const isGizmoObject = (o: { userData: Record<string, unknown> }) =>
	o.userData.gizmo === true;

/**
 * Material props for every visible gizmo part. Transparent (even though fully opaque) so three.js
 * draws it in the transparent pass, after the grid, piece outlines and face tints; with no depth
 * test and a high render order it then always ends up on top.
 */
export const gizmoMaterialProps = (color: string) =>
	({
		color,
		transparent: true,
		depthTest: false,
		depthWrite: false,
		toneMapped: false,
	}) as const;

/**
 * Orientation that lays a shape drawn in its local XY plane (arcs, the angle wedge) into the plane around each world axis,
 * with local +X/+Y mapped onto the two other world axes in right-handed order.
 * This matches how the rotate tool measures angles, so local angle θ is the tool's θ.
 */
export const PLANE_ORIENTATION: Record<Axis, Euler> = {
	x: basis(new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(1, 0, 0)),
	y: basis(new Vector3(0, 0, 1), new Vector3(1, 0, 0), new Vector3(0, 1, 0)),
	z: basis(new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)),
};

function basis(x: Vector3, y: Vector3, z: Vector3): Euler {
	return new Euler().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
}
