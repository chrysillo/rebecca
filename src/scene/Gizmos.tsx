import { centreOf, selectedPiecesPreviewed } from "../state/selectors";
import { useAppStore } from "../state/store";
import { GIZMO_RENDER_ORDER, gizmoMaterialProps } from "./gizmoStyle";
import { MoveArrows } from "./MoveArrows";
import { RotateArcs } from "./RotateArcs";
import { RotationReadout } from "./RotationReadout";
import { ScreenSizeGroup } from "./ScreenSizeGroup";

/**
 * With the Move tool, the selection gets one gizmo: arrows to move along an axis
 * and curved arcs to rotate about it. It sits at the selection centre and follows any drag preview.
 */
export function Gizmos() {
	const tool = useAppStore((s) => s.tool);
	const doc = useAppStore((s) => s.doc);
	const drag = useAppStore((s) => s.drag);

	const pieces = selectedPiecesPreviewed(doc, drag);
	if (tool !== "move" || pieces.length === 0) return null;
	const origin = centreOf(pieces);

	return (
		<ScreenSizeGroup position={origin}>
			<MoveArrows origin={origin} />
			<RotateArcs origin={origin} />
			<RotationReadout />
			<CentreDot />
		</ScreenSizeGroup>
	);
}

/** Small neutral dot marking the pivot. */
function CentreDot() {
	return (
		<mesh renderOrder={GIZMO_RENDER_ORDER}>
			<sphereGeometry args={[0.03, 16, 12]} />
			<meshBasicMaterial {...gizmoMaterialProps("#ffffff")} />
		</mesh>
	);
}
