/** Plain 3D vector in millimetres. Z is up; the floor is Z = 0. */
export type Vec3 = { x: number; y: number; z: number };

export type Axis = "x" | "y" | "z";

export const AXES: readonly Axis[] = ["x", "y", "z"];

/** Degrees to radians: rotations are stored in degrees, three.js wants radians. */
export const DEG = Math.PI / 180;

export const vec3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

export const add = (a: Vec3, b: Vec3): Vec3 => ({
	x: a.x + b.x,
	y: a.y + b.y,
	z: a.z + b.z,
});

export const sub = (a: Vec3, b: Vec3): Vec3 => ({
	x: a.x - b.x,
	y: a.y - b.y,
	z: a.z - b.z,
});

export const scale = (v: Vec3, s: number): Vec3 => ({
	x: v.x * s,
	y: v.y * s,
	z: v.z * s,
});

export const dot = (a: Vec3, b: Vec3): number =>
	a.x * b.x + a.y * b.y + a.z * b.z;

export const axisVector = (axis: Axis): Vec3 => ({
	x: axis === "x" ? 1 : 0,
	y: axis === "y" ? 1 : 0,
	z: axis === "z" ? 1 : 0,
});

/** Removes floating-point noise (e.g. 399.99999999) so values stay exact to the micron. */
export const roundMm = (n: number): number => Math.round(n * 1000) / 1000;

export const roundVec = (v: Vec3): Vec3 => ({
	x: roundMm(v.x),
	y: roundMm(v.y),
	z: roundMm(v.z),
});
