import { Euler, Matrix4, Vector3 } from "three";
import type { Axis } from "../geometry/vec";

/** Softer axis colours, Shapr3D style. */
export const AXIS_COLOR: Record<Axis, string> = {
	x: "#e5484d",
	y: "#30a46c",
	z: "#3e63dd",
};
export const HOVER_COLOR = "#ffb224";

/** Drawn after the scene and without depth testing, so gizmos are never hidden by pieces. */
export const GIZMO_RENDER_ORDER = 1000;

/** Tag put on gizmo hit areas so clicks that land on a handle don't also select what's behind it. */
export const GIZMO_USER_DATA = { gizmo: true } as const;

export const isGizmoObject = (o: { userData: Record<string, unknown> }) =>
	o.userData.gizmo === true;

/** Unlit, always-on-top material props shared by every visible gizmo part. */
export const gizmoMaterialProps = (color: string) =>
	({ color, depthTest: false, depthWrite: false, toneMapped: false }) as const;

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
