import { GizmoHelper } from "@react-three/drei";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	CanvasTexture,
	type PerspectiveCamera,
	Quaternion,
	Vector3,
} from "three";
import { piecesAabb } from "../geometry/box";
import { useAppStore } from "../state/store";

type OrbitLike = { target: Vector3; enabled: boolean; update: () => void };

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
const CUBE_SIZE = 90; // pixels

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
		if (a.t === 1) animation.current = null;
	});

	const lookFrom = (view: Vector3) => {
		if (!controls) return;
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
		<GizmoHelper alignment="top-right" margin={[85, 85]}>
			<group rotation={[Math.PI / 2, 0, 0]} scale={CUBE_SIZE}>
				<FaceCube onPick={lookFrom} controls={controls} />
			</group>
		</GizmoHelper>
	);
}

/** Extra room around the model in a standard view. */
const FIT_MARGIN = 1.2;

/** Where to aim and how far back to stand so the whole model fills a standard view. */
function fitModel(
	fovDegrees: number,
): { centre: Vector3; distance: number } | null {
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
	};
}

type FaceCubeProps = {
	onPick: (view: Vector3) => void;
	controls: OrbitLike | null;
};

function FaceCube({ onPick, controls }: FaceCubeProps) {
	const [hovered, setHovered] = useState<number | null>(null);
	const textures = useMemo(() => FACES.map((f) => labelTexture(f.label)), []);
	useEffect(
		() => () => {
			for (const t of textures) t.dispose();
		},
		[textures],
	);

	const faceOf = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
		e.faceIndex == null ? null : Math.floor(e.faceIndex / 2);

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
			<boxGeometry />
			{textures.map((texture, i) => (
				<meshBasicMaterial
					key={FACES[i].label}
					attach={`material-${i}`}
					map={texture}
					color={hovered === i ? "#f2b36b" : "#ffffff"}
				/>
			))}
		</mesh>
	);
}

function labelTexture(label: string): CanvasTexture {
	const size = 128;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.fillStyle = "#f5f3ef";
		ctx.fillRect(0, 0, size, size);
		ctx.strokeStyle = "#8a8478";
		ctx.lineWidth = 4;
		ctx.strokeRect(2, 2, size - 4, size - 4);
		ctx.fillStyle = "#3d3529";
		ctx.font = "600 22px system-ui, sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label.toUpperCase(), size / 2, size / 2);
	}
	return new CanvasTexture(canvas);
}
