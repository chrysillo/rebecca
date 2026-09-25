import type { ThreeEvent } from "@react-three/fiber";
import { useRef } from "react";
import { intersectPlane } from "@/geometry/rays";
import { type Axis, axisVector, type Vec3 } from "@/geometry/vec";
import { isHeld } from "@/input/modifiers";
import type { Piece } from "@/model/types";
import { toRay, useGizmoPointer } from "@/scene/useGizmoPointer";
import { selectedPieces, selectionPivot } from "@/state/selectors";
import { useAppStore } from "@/state/store";
import { commitDrag } from "@/tools/commitDrag";
import { angleAround, computeRotation } from "@/tools/rotateTool";

type Session = {
	axis: Axis;
	pivot: Vec3;
	pieces: Piece[];
	startAngle: number;
	lastAngle: number;
	/** Total angle dragged so far, unwrapped so it can pass ±180°. */
	total: number;
};

/** Connects rotation-ring pointer events to the rotate tool, previewing in the store until release. */
export function useRotateDrag() {
	const session = useRef<Session | null>(null);
	const pointer = useGizmoPointer();

	const pointerAngle = (
		e: ThreeEvent<PointerEvent>,
		axis: Axis,
		pivot: Vec3,
	) => {
		const hit = intersectPlane(toRay(e.ray), axisVector(axis), pivot);
		return hit ? angleAround(axis, pivot, hit) : null;
	};

	const onPointerDown = (axis: Axis) => (e: ThreeEvent<PointerEvent>) => {
		if (e.button !== 0) return;
		const { doc, setDrag } = useAppStore.getState();
		const pieces = selectedPieces(doc);
		const pivot = selectionPivot(pieces, doc.groupPivot);
		const angle = pointerAngle(e, axis, pivot);
		if (angle === null) return;
		pointer.capture(e);

		session.current = {
			axis,
			pivot,
			pieces,
			startAngle: angle,
			lastAngle: angle,
			total: 0,
		};
		setDrag({
			preview: Object.fromEntries(
				pieces.map((p) => [
					p.id,
					{ position: p.position, rotation: p.rotation },
				]),
			),
			// Alt (the duplicate modifier) rotates a copy, leaving the original where it is.
			duplicate: isHeld("duplicate", e),
			snapTarget: null,
			rotation: { axis, startAngle: angle, degrees: 0 },
		});
	};

	const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
		const s = session.current;
		const { drag, setDrag } = useAppStore.getState();
		if (!s || !drag) return;
		const angle = pointerAngle(e, s.axis, s.pivot);
		if (angle === null) return;

		s.total += wrap(angle - s.lastAngle);
		s.lastAngle = angle;
		const result = computeRotation({
			pieces: s.pieces,
			axis: s.axis,
			pivot: s.pivot,
			degrees: s.total,
			fine: isHeld("fine", e),
		});
		setDrag({
			...drag,
			preview: result.transforms,
			rotation: {
				axis: s.axis,
				startAngle: s.startAngle,
				degrees: result.degrees,
			},
		});
	};

	const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
		if (!session.current) return;
		pointer.release(e);
		session.current = null;
		commitDrag();
	};

	return { onPointerDown, onPointerMove, onPointerUp };
}

/** Wraps an angle difference into (-180, 180]. */
const wrap = (d: number) => d - 360 * Math.round(d / 360);
