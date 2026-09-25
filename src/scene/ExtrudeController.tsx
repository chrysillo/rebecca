import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { type PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { CONFIG } from "../config";
import { faceCentre, faceNormal } from "../geometry/box";
import { closestParamOnAxis } from "../geometry/rays";
import { isHeld } from "../input/modifiers";
import { lastPointer } from "../input/pointer";
import { snapTargets } from "../snapping/targets";
import { pixelsToMm } from "../snapping/tolerance";
import { useAppStore } from "../state/store";
import { cancelExtrude, confirmExtrude } from "../tools/extrudeSession";
import { computeExtrude } from "../tools/extrudeTool";
import { toRay } from "./useGizmoPointer";

type ModifierFlags = {
	shiftKey: boolean;
	altKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
};
const NO_MODIFIERS: ModifierFlags = {
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
};

/**
 * Drives an active extrude from the mouse, Blender style: the face follows the pointer
 * (no button held) along its normal. Left click confirms, right click cancels.
 * Renders nothing; it only translates pointer input into extrude state.
 */
export function ExtrudeController() {
	const active = useAppStore((s) => s.extrude !== null);
	const camera = useThree((s) => s.camera) as PerspectiveCamera;
	const canvas = useThree((s) => s.gl.domElement);
	const viewportHeight = useThree((s) => s.size.height);

	useEffect(() => {
		if (!active) return;
		const raycaster = new Raycaster();

		const update = (x: number, y: number, modifiers: ModifierFlags) => {
			const { extrude, doc, setExtrude } = useAppStore.getState();
			const piece = extrude ? doc.pieces[extrude.face.pieceId] : undefined;
			if (!extrude || !piece) return;

			const rect = canvas.getBoundingClientRect();
			const ndc = new Vector2(
				((x - rect.left) / rect.width) * 2 - 1,
				-((y - rect.top) / rect.height) * 2 + 1,
			);
			raycaster.setFromCamera(ndc, camera);
			const centre = faceCentre(piece, extrude.face);
			const normal = faceNormal(piece, extrude.face.axis, extrude.face.sign);
			const param = closestParamOnAxis(toRay(raycaster.ray), centre, normal);
			if (param === null) return;
			if (extrude.startParam === null) {
				setExtrude({ ...extrude, startParam: param });
				return;
			}

			const cameraDistance = camera.position.distanceTo(
				new Vector3(centre.x, centre.y, centre.z),
			);
			const result = computeExtrude({
				piece,
				face: extrude.face,
				targets: snapTargets(Object.values(doc.pieces), new Set([piece.id])),
				distance: param - extrude.startParam,
				fine: isHeld("fine", modifiers),
				tolerance: pixelsToMm(
					CONFIG.move.snapPixels,
					cameraDistance,
					camera.fov,
					viewportHeight,
				),
			});
			setExtrude({
				...extrude,
				distance: result.distance,
				snapTarget: result.snapTarget,
			});
		};

		// Measure where the mouse is right now, so the extrude starts at zero.
		const start = lastPointer();
		update(start.x, start.y, NO_MODIFIERS);

		const onMove = (e: PointerEvent) => update(e.clientX, e.clientY, e);

		// Capture-phase listeners on window run before R3F and the camera controls,
		// so the confirming click doesn't also select a face or start an orbit.
		const swallow = (e: Event) => {
			e.stopPropagation();
			e.preventDefault();
		};
		const onDown = (e: PointerEvent) => {
			if (e.target !== canvas) return;
			swallow(e);
			if (e.button === 0) confirmExtrude();
			else cancelExtrude();
			window.addEventListener("click", swallow, { capture: true, once: true });
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerdown", onDown, { capture: true });
		return () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerdown", onDown, { capture: true });
		};
	}, [active, camera, canvas, viewportHeight]);

	return null;
}
