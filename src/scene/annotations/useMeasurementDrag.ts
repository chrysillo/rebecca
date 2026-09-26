import { useThree } from "@react-three/fiber";
import { type PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three";
import { commands } from "@/commands";
import { measureEdges, measurementAt } from "@/geometry/measure";
import { intersectPlane } from "@/geometry/rays";
import { add, sub, type Vec3 } from "@/geometry/vec";
import type { Measurement } from "@/model/measurement";
import { toRay } from "@/scene/shared/useGizmoPointer";
import { applyCommand, useAppStore } from "@/state/store";

/**
 * Dragging a measurement's label slides the dimension across the face, along the edges it
 * measures between (it can't leave them). Released, it's one undo step.
 */
export function useMeasurementDrag() {
	const camera = useThree((s) => s.camera) as PerspectiveCamera;
	const canvas = useThree((s) => s.gl.domElement);

	return (e: React.PointerEvent, m: Measurement) => {
		if (e.button !== 0) return;
		const { pieces } = useAppStore.getState().doc;
		const d = measureEdges(pieces, m.from, m.to, m.at);
		if (!d || measurementAt(pieces, m.from, m.to, d.start) === null) return;
		e.preventDefault();
		e.stopPropagation();

		// Track the pointer on a plane through the line, turned to face the camera.
		const line = new Vector3(
			d.end.x - d.start.x,
			d.end.y - d.start.y,
			d.end.z - d.start.z,
		);
		const view = camera.getWorldDirection(new Vector3());
		const n = line.clone().cross(view).cross(line).normalize();
		const normal: Vec3 = { x: n.x, y: n.y, z: n.z };
		const raycaster = new Raycaster();
		const hitAt = (x: number, y: number) => {
			const rect = canvas.getBoundingClientRect();
			raycaster.setFromCamera(
				new Vector2(
					((x - rect.left) / rect.width) * 2 - 1,
					-((y - rect.top) / rect.height) * 2 + 1,
				),
				camera,
			);
			return intersectPlane(toRay(raycaster.ray), normal, d.start);
		};
		const grab = hitAt(e.clientX, e.clientY);
		if (!grab) return;
		useAppStore.getState().setMeasureDrag({ id: m.id, at: m.at });

		const onMove = (ev: PointerEvent) => {
			const hit = hitAt(ev.clientX, ev.clientY);
			if (!hit) return;
			const at = measurementAt(
				pieces,
				m.from,
				m.to,
				add(d.start, sub(hit, grab)),
			);
			if (at !== null) useAppStore.getState().setMeasureDrag({ id: m.id, at });
		};
		const onUp = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			const { measureDrag, setMeasureDrag } = useAppStore.getState();
			setMeasureDrag(null);
			if (measureDrag)
				applyCommand(commands.moveMeasurement(m.id, measureDrag.at));
		};
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	};
}
