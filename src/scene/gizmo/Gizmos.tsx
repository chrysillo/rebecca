import { useState } from "react";
import { commands } from "@/commands";
import type { Pivot } from "@/model/types";
import { MoveArrows } from "@/scene/gizmo/MoveArrows";
import { PivotHandle, PivotTargets } from "@/scene/gizmo/PivotHandle";
import { RotateArcs } from "@/scene/gizmo/RotateArcs";
import { RotationReadout } from "@/scene/gizmo/RotationReadout";
import { useCameraView } from "@/scene/gizmo/useCameraView";
import { ScreenSizeGroup } from "@/scene/shared/ScreenSizeGroup";
import {
	activePivot,
	selectedPiecesPreviewed,
	selectionPivot,
} from "@/state/selectors";
import { applyCommand, useAppStore } from "@/state/store";

/**
 * With the Select tool, the selection gets one gizmo: arrows to move along an axis and curved arcs
 * to rotate about it. It sits at the pivot and follows any drag preview. Dragging the white centre
 * dot moves the pivot: a single piece's own, or the group pivot when several pieces are selected.
 */
export function Gizmos() {
	const tool = useAppStore((s) => s.tool);
	const doc = useAppStore((s) => s.doc);
	const drag = useAppStore((s) => s.drag);
	// While the pivot dot is being dragged: the pivot it's currently snapped to.
	const [pivotPreview, setPivotPreview] = useState<Pivot | null>(null);

	const pieces = selectedPiecesPreviewed(doc, drag);
	const busy = useAppStore((s) => s.extrude !== null || s.joiner !== null);
	const shown = tool === "select" && !busy && pieces.length > 0;
	const origin = shown
		? selectionPivot(pieces, doc.groupPivot, pivotPreview)
		: null;
	// Which side of the gizmo the camera is on, so handles face the viewer (Shapr3D style).
	const view = useCameraView(origin);
	if (!shown || !origin) return null;
	const current = activePivot(pieces, doc.groupPivot);

	const commitPivot = (pivot: Pivot) =>
		applyCommand(
			pieces.length === 1
				? commands.setPivot(pieces[0].id, pivot)
				: commands.setGroupPivot(pivot),
		);

	return (
		<>
			{pivotPreview && <PivotTargets pieces={pieces} active={pivotPreview} />}
			<ScreenSizeGroup position={origin}>
				{/* Arrows and arcs step aside while the pivot is being placed. */}
				{!pivotPreview && (
					<>
						<MoveArrows origin={origin} view={view} />
						<RotateArcs view={view} />
						<RotationReadout />
					</>
				)}
				<PivotHandle
					pieces={pieces}
					current={current}
					onPreview={setPivotPreview}
					onCommit={commitPivot}
				/>
			</ScreenSizeGroup>
		</>
	);
}
