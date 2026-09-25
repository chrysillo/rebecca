import { GizmoHelper, Line } from "@react-three/drei";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	CanvasTexture,
	type PerspectiveCamera,
	Quaternion,
	Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { piecesAabb } from "@/geometry/box";
import { AXIS_X, AXIS_Y, AXIS_Z } from "@/scene/Floor";
import { useAppStore } from "@/state/store";

type OrbitLike = {
	target: Vector3;
	enabled: boolean;
	update: () => void;
	addEventListener: (type: "change", listener: () => void) => void;
	removeEventListener: (type: "change", listener: () => void) => void;
};

/**
 * Standard views look orthographic: the camera narrows to this field of view and backs off so the
 * framing is unchanged (a telephoto view has no visible perspective). Keeping the one perspective
 * camera means snapping, gizmo sizing and picking all work as normal.
 */
const ORTHO_FOV = 0.8;

/** Set while a standard view is shown flat: what to restore when the user orbits away. */
type Flat = {
	direction: Vector3;
	fov: number;
	near: number;
	far: number;
	/** How far in front of and behind the orbit target to draw (mm). */
	reach: number;
};

type Animation = {
	fromDirection: Vector3;
	toDirection: Vector3;
	fromTarget: Vector3;
	toTarget: Vector3;
	fromDistance: number;
	toDistance: number;
	t: number;
};

const DURATION = 0.35; // seconds
const CUBE_SIZE = 56; // pixels
/** Chamfer size and smoothness, in units of the cube's unit-box geometry. */
const BEVEL_RADIUS = 0.09;
const BEVEL_SEGMENTS = 4;
/**
 * Share of the texture's width/height, on each edge, that RoundedBoxGeometry maps onto
 * the curved bevel rather than the flat part of the face (mirrors the arc/plane ratio
 * getUv() in three's RoundedBoxGeometry computes for a unit box). Used to keep the
 * texture's flat-face rectangle lined up with the geometry's actual flat region, so the
 * chamfer reads as a plain white band around a tinted face, not a color that bleeds onto
 * the curve or a rectangle that misses it.
 */
const BEVEL_UV_MARGIN = (() => {
	const arc = (Math.PI / 2) * BEVEL_RADIUS;
	const flat = Math.max(1 - 2 * BEVEL_RADIUS, 0);
	return 0.5 * (arc / (arc + flat));
})();
/** The chamfer itself stays this colour on every face, so the cube's edges read crisp
 * against the page no matter what the flat faces are tinted. */
const EDGE_COLOR = "#ffffff";
/** Flat-face fill — a soft neutral, a little more colour than the pure-white edges. */
const FACE = { fill: "#f2f1ee", ink: "#737373" };
/** Matches the scene's selection accent (see FaceHighlight/FaceArrow/PivotHandle). */
const HOVER = { fill: "#eff6ff", ink: "#3b82f6" };
/** Label texture resolution; the font size is relative to it. */
const TEX = 256;
const LABEL_FONT = '600 76px "Barlow Condensed", system-ui, sans-serif';

/**
 * Faces in BoxGeometry material order (+X, -X, +Y, -Y, +Z, -Z of the cube mesh), with the
 * world direction the camera moves to. The cube is turned +90° about X so its +Y is our +Z (up).
 * Looking straight down/up is singular for orbit controls, so Top/Bottom lean a hair toward Front.
 */
const FACES = [
	{ label: "Right", view: new Vector3(1, 0, 0) },
	{ label: "Left", view: new Vector3(-1, 0, 0) },
	{ label: "Top", view: new Vector3(0, -1e-4, 1).normalize() },
	{ label: "Bottom", view: new Vector3(0, -1e-4, -1).normalize() },
	{ label: "Front", view: new Vector3(0, -1, 0) },
	{ label: "Back", view: new Vector3(0, 1, 0) },
] as const;

/**
 * Top-right navigation cube. Clicking a face (Front, Back, Left, Right, Top, Bottom)
 * turns the camera to look at the model from that side. The hovered face is the one that will be picked.
 */
export function ViewCube() {
	const camera = useThree((s) => s.camera);
	const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
	const animation = useRef<Animation | null>(null);
	const flat = useRef<Flat | null>(null);

	/** Swaps between the normal and the narrow lens, keeping the framing the same. */
	const setLens = (fov: number) => {
		const cam = camera as PerspectiveCamera;
		if (!controls || cam.fov === fov) return;
		const offset = cam.position.clone().sub(controls.target);
		const ratio =
			Math.tan((cam.fov * Math.PI) / 360) / Math.tan((fov * Math.PI) / 360);
		cam.position.copy(controls.target).addScaledVector(offset, ratio);
		cam.fov = fov;
	};

	const flatten = (direction: Vector3) => {
		const cam = camera as PerspectiveCamera;
		if (!controls || flat.current) return;
		flat.current = {
			direction,
			fov: cam.fov,
			near: cam.near,
			far: cam.far,
			reach: Math.max(20000, (fitModel(ORTHO_FOV)?.radius ?? 0) * 4),
		};
		setLens(ORTHO_FOV);
		fitDepth();
		controls.update();
	};

	/**
	 * Depth range around the orbit target only, so the far-off camera keeps depth precision.
	 * Redone on every zoom: the camera is so far back that a small zoom moves it a long way.
	 */
	const fitDepth = () => {
		const f = flat.current;
		const cam = camera as PerspectiveCamera;
		if (!f || !controls) return;
		const distance = cam.position.distanceTo(controls.target);
		cam.near = Math.max(5, distance - f.reach);
		cam.far = distance + f.reach;
		cam.updateProjectionMatrix();
	};

	const unflatten = () => {
		const f = flat.current;
		const cam = camera as PerspectiveCamera;
		if (!f || !controls) return;
		flat.current = null;
		setLens(f.fov);
		cam.near = f.near;
		cam.far = f.far;
		cam.updateProjectionMatrix();
	};

	// Orbiting away from the standard view goes back to perspective; zooming and panning don't.
	useEffect(() => {
		if (!controls) return;
		const onChange = () => {
			const f = flat.current;
			if (!f || animation.current) return;
			const direction = camera.position
				.clone()
				.sub(controls.target)
				.normalize();
			if (direction.angleTo(f.direction) > 1e-3) {
				unflatten();
				controls.update();
			} else fitDepth();
		};
		controls.addEventListener("change", onChange);
		return () => controls.removeEventListener("change", onChange);
	});

	useFrame((_, delta) => {
		const a = animation.current;
		if (!a || !controls) return;
		a.t = Math.min(1, a.t + delta / DURATION);
		const eased = 1 - (1 - a.t) ** 3;
		const turn = new Quaternion().slerp(
			new Quaternion().setFromUnitVectors(a.fromDirection, a.toDirection),
			eased,
		);
		const direction = a.fromDirection.clone().applyQuaternion(turn);
		controls.target.lerpVectors(a.fromTarget, a.toTarget, eased);
		camera.position
			.copy(controls.target)
			.addScaledVector(
				direction,
				a.fromDistance + (a.toDistance - a.fromDistance) * eased,
			);
		controls.update();
		if (a.t === 1) {
			animation.current = null;
			flatten(a.toDirection);
		}
	});

	const lookFrom = (view: Vector3) => {
		if (!controls) return;
		unflatten();
		const offset = camera.position.clone().sub(controls.target);
		const fit = fitModel((camera as PerspectiveCamera).fov);
		animation.current = {
			fromDirection: offset.clone().normalize(),
			toDirection: view.clone(),
			fromTarget: controls.target.clone(),
			toTarget: fit?.centre ?? controls.target.clone(),
			fromDistance: offset.length(),
			toDistance: fit?.distance ?? offset.length(),
			t: 0,
		};
	};

	return (
		<GizmoHelper alignment="top-right" margin={[96, 84]}>
			<group rotation={[Math.PI / 2, 0, 0]} scale={CUBE_SIZE}>
				<FaceCube onPick={lookFrom} controls={controls} />
			</group>
			<AxisTriad />
		</GizmoHelper>
	);
}

/** Extra room around the model in a standard view. */
const FIT_MARGIN = 1.2;

/** Where to aim and how far back to stand so the whole model fills a standard view. */
function fitModel(
	fovDegrees: number,
): { centre: Vector3; distance: number; radius: number } | null {
	const pieces = Object.values(useAppStore.getState().doc.pieces);
	if (pieces.length === 0) return null;
	const { min, max } = piecesAabb(pieces);
	const lo = new Vector3(min.x, min.y, min.z);
	const hi = new Vector3(max.x, max.y, max.z);
	const radius = hi.distanceTo(lo) / 2;
	const halfFov = (fovDegrees * Math.PI) / 360;
	return {
		centre: lo.add(hi).multiplyScalar(0.5),
		distance: (radius / Math.sin(halfFov)) * FIT_MARGIN,
		radius,
	};
}

type FaceCubeProps = {
	onPick: (view: Vector3) => void;
	controls: OrbitLike | null;
};

function FaceCube({ onPick, controls }: FaceCubeProps) {
	const [hovered, setHovered] = useState<number | null>(null);
	const [textures, setTextures] = useState(faceTextures);
	// Redraw the labels once the UI font has loaded (canvas text doesn't wait for web fonts).
	useEffect(() => {
		let live = true;
		document.fonts.load(LABEL_FONT).then(() => {
			if (live) setTextures(faceTextures());
		});
		return () => {
			live = false;
		};
	}, []);
	useEffect(
		() => () => {
			for (const t of [...textures.normal, ...textures.hover]) t.dispose();
		},
		[textures],
	);

	// A true beveled box, so faces meet at real chamfered edges instead of a painted gap.
	const geometry = useMemo(
		() => new RoundedBoxGeometry(1, 1, 1, BEVEL_SEGMENTS, BEVEL_RADIUS),
		[],
	);
	useEffect(() => () => geometry.dispose(), [geometry]);

	// The bevel is subdivided into many triangles, so read the face from its material
	// group rather than assuming two triangles per face as a plain box would have.
	const faceOf = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
		e.face?.materialIndex ?? null;

	return (
		<mesh
			onPointerMove={(e) => {
				e.stopPropagation();
				setHovered(faceOf(e));
			}}
			onPointerDown={(e) => {
				// Stop the press on the cube from also starting a camera pan.
				e.stopPropagation();
				if (controls) controls.enabled = false;
			}}
			onPointerUp={() => {
				if (controls) controls.enabled = true;
			}}
			onPointerOut={() => {
				setHovered(null);
				if (controls) controls.enabled = true;
			}}
			onClick={(e) => {
				e.stopPropagation();
				const face = faceOf(e);
				if (face !== null) onPick(FACES[face].view);
			}}
		>
			<primitive object={geometry} attach="geometry" />
			{FACES.map((face, i) => (
				<meshBasicMaterial
					key={face.label}
					attach={`material-${i}`}
					map={hovered === i ? textures.hover[i] : textures.normal[i]}
					// Unlit: the fill colour renders exactly as painted, not dimmed by scene
					// lights or the tone curve — the one way to guarantee it reads whiter
					// than the page background regardless of the main viewport's lighting.
					toneMapped={false}
				/>
			))}
		</mesh>
	);
}

function faceTextures() {
	return {
		normal: FACES.map((f) => labelTexture(f.label, FACE)),
		hover: FACES.map((f) => labelTexture(f.label, HOVER)),
	};
}

/**
 * A face tile. The texture wraps the whole face including the curved chamfer at its
 * border (see BEVEL_UV_MARGIN), so it's painted as two layers: the chamfer band stays
 * EDGE_COLOR everywhere, and an inset rectangle — sized to land exactly on the flat part
 * of the geometry — gets this face's tint. The material is unlit (meshBasicMaterial), so
 * both colours render exactly as painted, with nothing dimming them toward grey.
 */
function labelTexture(
	label: string,
	look: { fill: string; ink: string },
): CanvasTexture {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = TEX;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.fillStyle = EDGE_COLOR;
		ctx.fillRect(0, 0, TEX, TEX);

		const inset = TEX * BEVEL_UV_MARGIN;
		ctx.fillStyle = look.fill;
		ctx.fillRect(inset, inset, TEX - 2 * inset, TEX - 2 * inset);

		ctx.fillStyle = look.ink;
		ctx.font = LABEL_FONT;
		ctx.letterSpacing = `${TEX * 0.02}px`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label.toUpperCase(), TEX / 2, TEX / 2 + TEX * 0.02);
	}
	const texture = new CanvasTexture(canvas);
	texture.anisotropy = 4;
	return texture;
}

/** Where the axis triad starts (a corner just outside the unit cube) and how far its arms reach. */
const TRIAD_ORIGIN = -0.54;
const TRIAD_LENGTH = 1.45;
const AXES = [
	{ name: "X", dir: [1, 0, 0], color: AXIS_X },
	{ name: "Y", dir: [0, 1, 0], color: AXIS_Y },
	{ name: "Z", dir: [0, 0, 1], color: AXIS_Z },
] as const;

/** X / Y / Z arms from the cube's back-bottom-left corner, labelled, in the axis colours. */
function AxisTriad() {
	const letters = useMemo(
		() => AXES.map((a) => letterTexture(a.name, a.color)),
		[],
	);
	useEffect(
		() => () => {
			for (const t of letters) t.dispose();
		},
		[letters],
	);
	const along = (dir: readonly number[], length: number) =>
		dir.map((d) => TRIAD_ORIGIN + d * length) as [number, number, number];
	const origin: [number, number, number] = [
		TRIAD_ORIGIN,
		TRIAD_ORIGIN,
		TRIAD_ORIGIN,
	];

	return (
		<group scale={CUBE_SIZE}>
			{AXES.map((a, i) => (
				<group key={a.name}>
					<Line
						points={[origin, along(a.dir, TRIAD_LENGTH)]}
						color={a.color}
						lineWidth={1.5}
						raycast={() => null}
					/>
					<sprite
						position={along(a.dir, TRIAD_LENGTH + 0.24)}
						scale={0.34}
						raycast={() => null}
					>
						<spriteMaterial map={letters[i]} />
					</sprite>
				</group>
			))}
		</group>
	);
}

function letterTexture(letter: string, color: string): CanvasTexture {
	const size = 64;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.fillStyle = color;
		ctx.font = '600 40px "JetBrains Mono", ui-monospace, monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(letter, size / 2, size / 2);
	}
	return new CanvasTexture(canvas);
}
