import { type ThreeEvent, useThree } from "@react-three/fiber";
import { type PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { CONFIG } from "@/config";
import type { FacePlane } from "@/geometry/box";
import { intersectPlane, type Ray } from "@/geometry/rays";
import { AXES, type Axis, sub, type Vec3 } from "@/geometry/vec";
import { isHeld } from "@/input/modifiers";
import type { Id, Piece } from "@/model/types";
import { toRay } from "@/scene/shared/useGizmoPointer";
import { useOrbitControls } from "@/scene/shared/useOrbitControls";
import { snapTargets } from "@/snapping/targets";
import { pixelsToMm } from "@/snapping/tolerance";
import { selectedPieces } from "@/state/selectors";
import { useAppStore } from "@/state/store";
import { commitDrag } from "@/tools/commitDrag";
import { computePlaneMove } from "@/tools/moveTool";

/** Pointer travel (px) before a press on a selected piece becomes a drag rather than a click. */
const DRAG_SLOP = 4;

/**
 * Pressing on a selected piece and dragging slides the selection across a plane: the plane of the
 * face that was grabbed (squared up to the nearest world axis), through the point grabbed. Grab the
 * top to slide along the floor or a shelf; grab a side to slide up/down and along that side.
 * A press that doesn't move is left alone, so it's still a click.
 */
export function usePlaneDrag() {
	const camera = useThree((s) => s.camera) as PerspectiveCamera;
	const canvas = useThree((s) => s.gl.domElement);
	const viewportHeight = useThree((s) => s.size.height);
	const controls = useOrbitControls();

	return (e: ThreeEvent<PointerEvent>, pieceId: Id, worldNormal: Vec3) => {
		const { doc, tool } = useAppStore.getState();
		if (e.button !== 0 || tool !== "select") return;
		const pieces = selectedPieces(doc);
		if (!pieces.some((p) => p.id === pieceId)) return;

		const normalAxis = dominantAxis(worldNormal);
		const planeNormal = { x: 0, y: 0, z: 0, [normalAxis]: 1 } as Vec3;
		const grab: Vec3 = { x: e.point.x, y: e.point.y, z: e.point.z };
		const inPlane = AXES.filter((a) => a !== normalAxis);
		const startX = e.nativeEvent.clientX;
		const startY = e.nativeEvent.clientY;
		const raycaster = new Raycaster();
		let started = false;
		let targets: FacePlane[] = [];

		const rayAt = (x: number, y: number): Ray => {
			const rect = canvas.getBoundingClientRect();
			raycaster.setFromCamera(
				new Vector2(
					((x - rect.left) / rect.width) * 2 - 1,
					-((y - rect.top) / rect.height) * 2 + 1,
				),
				camera,
			);
			return toRay(raycaster.ray);
		};

		const begin = (duplicate: boolean) => {
			started = true;
			if (controls) controls.enabled = false;
			// A copy may snap to its own original; a moved piece may not snap to itself.
			const exclude = new Set<Id>(duplicate ? [] : doc.selection);
			targets = snapTargets(Object.values(doc.pieces), exclude);
			useAppStore.getState().setDrag({
				preview: previewOf(pieces),
				duplicate,
				snapTarget: null,
				rotation: null,
				moveAxis: null,
			});
		};

		const onMove = (ev: PointerEvent) => {
			if (!started) {
				if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_SLOP)
					return;
				begin(isHeld("duplicate", ev));
			}
			const { drag, setDrag } = useAppStore.getState();
			if (!drag) return;
			const hit = intersectPlane(
				rayAt(ev.clientX, ev.clientY),
				planeNormal,
				grab,
			);
			if (!hit) return;
			const delta = sub(hit, grab);
			const cameraDistance = camera.position.distanceTo(
				new Vector3(grab.x, grab.y, grab.z),
			);
			const result = computePlaneMove({
				pieces,
				targets,
				travel: Object.fromEntries(inPlane.map((a) => [a, delta[a]])),
				fine: isHeld("fine", ev),
				tolerance: pixelsToMm(
					CONFIG.move.snapPixels,
					cameraDistance,
					camera.fov,
					viewportHeight,
				),
			});
			setDrag({
				...drag,
				preview: result.transforms,
				snapTarget: result.snapTarget,
				// The live gap dimensions follow whichever way it has moved furthest.
				moveAxis:
					Math.abs(delta[inPlane[0]]) >= Math.abs(delta[inPlane[1]])
						? inPlane[0]
						: inPlane[1],
			});
		};

		const onUp = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			if (!started) return;
			if (controls) controls.enabled = true;
			commitDrag();
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};
}

const previewOf = (pieces: Piece[]) =>
	Object.fromEntries(
		pieces.map((p) => [p.id, { position: p.position, rotation: p.rotation }]),
	);

function dominantAxis(v: Vec3): Axis {
	const [a] = [...AXES].sort((p, q) => Math.abs(v[q]) - Math.abs(v[p]));
	return a;
}
