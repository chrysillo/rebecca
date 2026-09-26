import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
	DoubleSide,
	type Group,
	Matrix4,
	Shape,
	ShapeGeometry,
	Vector2,
	Vector3,
} from "three";
import {
	GIZMO_RENDER_ORDER,
	gizmoMaterialProps,
} from "@/scene/shared/gizmoStyle";

/**
 * The gizmo's handles are flat shapes with slightly softened corners (design option 6a): a
 * coloured core on a white body with a soft shadow, drawn on top of everything. Sizes are in
 * gizmo units (~130 px).
 */
const SHAFT_HALF = 0.0176;
const HEAD_LENGTH = 0.082;
const HEAD_HALF = 0.051;
/** How far the white body reaches past the coloured core, all round. */
const BODY = 0.019;
/** Corner rounding of the core (the body and shadow follow it), and points per rounded corner. */
const CORNER_RADIUS = 0.007;
const CORNER_STEPS = 4;
const BODY_COLOR = "#ffffff";
/** The soft shadow: rings past the body, each fainter than the last. */
const SHADOW: [grow: number, opacity: number][] = [
	[0.008, 0.14],
	[0.02, 0.06],
];
const SHADOW_COLOR = "#000000";
/** A sharp tip's white body would spike; mitres are capped at this many times the offset. */
const MITRE_LIMIT = 2.5;

type Tuple = [number, number, number];

/** A straight arrow from `from` to `to` (the tip), turned about its axis so its face looks at the camera. */
export function SolidArrow({
	from,
	to,
	color,
	opacity = 1,
	twoHeads = false,
}: {
	from: Tuple;
	to: Tuple;
	color: string;
	opacity?: number;
	/** Heads at both ends, for handles that push either way. */
	twoHeads?: boolean;
}) {
	const group = useRef<Group>(null);
	const start = new Vector3(...from);
	const axis = new Vector3(...to).sub(start);
	const length = axis.length();
	const outline = useMemo(
		() => arrowOutline(length, twoHeads),
		[length, twoHeads],
	);

	useFrame(({ camera }) => {
		const g = group.current;
		const parent = g?.parent;
		if (!g || !parent || length === 0) return;
		const x = axis.clone().normalize();
		// The camera in the parent's frame (which may be mirrored), relative to the arrow.
		const view = parent.worldToLocal(camera.position.clone()).sub(start);
		const z = view.sub(x.clone().multiplyScalar(view.dot(x)));
		if (z.lengthSq() < 1e-12) return;
		z.normalize();
		const y = new Vector3().crossVectors(z, x);
		g.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
	});

	return (
		<group ref={group} position={from}>
			<FlatHandle outline={outline} color={color} opacity={opacity} />
		</group>
	);
}

/**
 * A curved arrow along a circle in the local XY plane, head at each end: `start` and `span` are
 * angles (radians) of the whole arrow, tips included.
 */
export function SolidArc({
	radius,
	start,
	span,
	color,
	opacity = 1,
}: {
	radius: number;
	start: number;
	span: number;
	color: string;
	opacity?: number;
}) {
	const outline = useMemo(
		() => arcOutline(radius, start, span),
		[radius, start, span],
	);
	return <FlatHandle outline={outline} color={color} opacity={opacity} />;
}

/** A round handle facing the camera: white disc, coloured centre. */
export function GizmoDisc({
	radius,
	dotRadius,
	color,
	opacity = 1,
}: {
	radius: number;
	dotRadius: number;
	color: string;
	opacity?: number;
}) {
	return (
		<Billboard>
			{SHADOW.map(([grow, alpha]) => (
				<mesh key={grow} renderOrder={GIZMO_RENDER_ORDER - 3}>
					<circleGeometry args={[radius + grow, 32]} />
					<Material color={SHADOW_COLOR} opacity={alpha * opacity} />
				</mesh>
			))}
			<mesh renderOrder={GIZMO_RENDER_ORDER - 2}>
				<circleGeometry args={[radius, 32]} />
				<Material color={BODY_COLOR} opacity={opacity} />
			</mesh>
			<mesh renderOrder={GIZMO_RENDER_ORDER}>
				<circleGeometry args={[dotRadius, 24]} />
				<Material color={color} opacity={opacity} />
			</mesh>
		</Billboard>
	);
}

/**
 * Shadow, white body and coloured core of one flat outline. Every handle's shadow and body draw
 * before any core, so where handles cross, both cores stay visible.
 */
function FlatHandle({
	outline,
	color,
	opacity,
}: {
	outline: Vector2[];
	color: string;
	opacity: number;
}) {
	const geometry = useMemo(() => {
		const core = roundCorners(counterClockwise(outline), CORNER_RADIUS);
		return {
			core: toGeometry(core),
			body: toGeometry(offsetPolygon(core, BODY)),
			shadows: SHADOW.map(([grow]) =>
				toGeometry(offsetPolygon(core, BODY + grow)),
			),
		};
	}, [outline]);
	useEffect(
		() => () => {
			geometry.core.dispose();
			geometry.body.dispose();
			for (const g of geometry.shadows) g.dispose();
		},
		[geometry],
	);

	return (
		<>
			{geometry.shadows.map((g, i) => (
				<mesh
					key={SHADOW[i][0]}
					geometry={g}
					renderOrder={GIZMO_RENDER_ORDER - 3}
				>
					<Material color={SHADOW_COLOR} opacity={SHADOW[i][1] * opacity} />
				</mesh>
			))}
			<mesh geometry={geometry.body} renderOrder={GIZMO_RENDER_ORDER - 2}>
				<Material color={BODY_COLOR} opacity={opacity} />
			</mesh>
			<mesh geometry={geometry.core} renderOrder={GIZMO_RENDER_ORDER}>
				<Material color={color} opacity={opacity} />
			</mesh>
		</>
	);
}

function Material({ color, opacity }: { color: string; opacity: number }) {
	return (
		<meshBasicMaterial
			{...gizmoMaterialProps(color)}
			opacity={opacity}
			side={DoubleSide}
		/>
	);
}

/** Shaft plus head along +X from 0 to `length`; a second head at 0 when `twoHeads`. */
function arrowOutline(length: number, twoHeads: boolean): Vector2[] {
	const head = Math.min(HEAD_LENGTH, length / (twoHeads ? 2 : 1));
	const neck = length - head;
	const front = [
		new Vector2(neck, SHAFT_HALF),
		new Vector2(neck, HEAD_HALF),
		new Vector2(length, 0),
		new Vector2(neck, -HEAD_HALF),
		new Vector2(neck, -SHAFT_HALF),
	];
	const back = twoHeads
		? [
				new Vector2(head, -SHAFT_HALF),
				new Vector2(head, -HEAD_HALF),
				new Vector2(0, 0),
				new Vector2(head, HEAD_HALF),
				new Vector2(head, SHAFT_HALF),
			]
		: [new Vector2(0, -SHAFT_HALF), new Vector2(0, SHAFT_HALF)];
	return [...front, ...back];
}

/** A ribbon along the circle from `start` to `start + span`, with a head at each end. */
function arcOutline(radius: number, start: number, span: number): Vector2[] {
	const headAngle = Math.min(HEAD_LENGTH / radius, span / 2);
	const a0 = start + headAngle;
	const a1 = start + span - headAngle;
	const at = (r: number, a: number) =>
		new Vector2(r * Math.cos(a), r * Math.sin(a));
	const steps = Math.max(2, Math.ceil(((a1 - a0) * 180) / Math.PI / 3));
	const edge = (r: number) =>
		Array.from({ length: steps + 1 }, (_, i) =>
			at(r, a0 + ((a1 - a0) * i) / steps),
		);
	// Tips sit a head's length along the tangent from where each head starts.
	const tip = (a: number, dir: 1 | -1) =>
		at(radius, a).add(
			new Vector2(-Math.sin(a), Math.cos(a)).multiplyScalar(dir * HEAD_LENGTH),
		);
	return [
		...edge(radius + SHAFT_HALF),
		at(radius + HEAD_HALF, a1),
		tip(a1, 1),
		at(radius - HEAD_HALF, a1),
		...edge(radius - SHAFT_HALF).reverse(),
		at(radius - HEAD_HALF, a0),
		tip(a0, -1),
		at(radius + HEAD_HALF, a0),
	];
}

function counterClockwise(points: Vector2[]): Vector2[] {
	let area = 0;
	points.forEach((p, i) => {
		const q = points[(i + 1) % points.length];
		area += p.x * q.y - q.x * p.y;
	});
	return area < 0 ? [...points].reverse() : points;
}

/**
 * Replaces each corner with a short curve starting `radius` back along both edges (less on short
 * edges), so tips and shoulders read as softened rather than razor-sharp.
 */
function roundCorners(points: Vector2[], radius: number): Vector2[] {
	const n = points.length;
	return points.flatMap((p, i) => {
		const prev = points[(i - 1 + n) % n];
		const next = points[(i + 1) % n];
		const r = Math.min(
			radius,
			p.distanceTo(prev) * 0.4,
			p.distanceTo(next) * 0.4,
		);
		const a = p.clone().lerp(prev, r / p.distanceTo(prev));
		const b = p.clone().lerp(next, r / p.distanceTo(next));
		// A quadratic curve from a to b, with the corner as its control point.
		return Array.from({ length: CORNER_STEPS + 1 }, (_, k) => {
			const t = k / CORNER_STEPS;
			return a
				.clone()
				.multiplyScalar((1 - t) ** 2)
				.addScaledVector(p, 2 * t * (1 - t))
				.addScaledVector(b, t * t);
		});
	});
}

/** Grows a counter-clockwise polygon outwards by `k`, with mitred (capped) corners. */
function offsetPolygon(points: Vector2[], k: number): Vector2[] {
	const n = points.length;
	const normal = (a: Vector2, b: Vector2) =>
		new Vector2(b.y - a.y, a.x - b.x).normalize();
	return points.map((p, i) => {
		const n1 = normal(points[(i - 1 + n) % n], p);
		const n2 = normal(p, points[(i + 1) % n]);
		const mitre = n1.clone().add(n2);
		if (mitre.lengthSq() < 1e-12) return p.clone().addScaledVector(n1, k);
		mitre.normalize();
		const reach = Math.min(k / Math.max(mitre.dot(n1), 1e-6), k * MITRE_LIMIT);
		return p.clone().addScaledVector(mitre, reach);
	});
}

const toGeometry = (points: Vector2[]) => new ShapeGeometry(new Shape(points));
