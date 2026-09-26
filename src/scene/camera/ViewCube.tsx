import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { type PerspectiveCamera, Quaternion, Vector3 } from "three";
import { piecesAabb } from "@/geometry/box";
import { AxisTriad } from "@/scene/camera/AxisTriad";
import { CubeHud } from "@/scene/camera/CubeHud";
import { FaceCube } from "@/scene/camera/FaceCube";
import { useOrbitControls } from "@/scene/shared/useOrbitControls";
import { useAppStore } from "@/state/store";
import { registerLookFrom } from "@/tools/cameraViews";

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
/**
 * Top-right navigation cube. Clicking a face (Front, Back, Left, Right, Top, Bottom)
 * turns the camera to look at the model from that side. The hovered face is the one that will be picked.
 */
export function ViewCube() {
	const camera = useThree((s) => s.camera);
	const controls = useOrbitControls();
	const animation = useRef<Animation | null>(null);
	const flat = useRef<Flat | null>(null);
	/** Mirrors `flat` for the axis triad, which drops the arm pointing along a flat view. */
	const [flatView, setFlatView] = useState<Vector3 | null>(null);

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
		setFlatView(direction);
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
		setFlatView(null);
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

	// Registered every render (like the `onChange` listener above) so the `1`–`4` shortcuts
	// always reach the current closure over `controls` and the animation/flat refs.
	useEffect(() => registerLookFrom(lookFrom));

	return (
		<CubeHud flat={flatView !== null}>
			<group rotation={[Math.PI / 2, 0, 0]}>
				<FaceCube onPick={lookFrom} controls={controls} />
			</group>
			<AxisTriad flatView={flatView} />
		</CubeHud>
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
