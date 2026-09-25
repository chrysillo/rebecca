import { centreOf, selectedPiecesPreviewed } from "../state/selectors";
import { useAppStore } from "../state/store";
import { MoveArrows } from "./MoveArrows";
import { RotateRings } from "./RotateRings";
import { ScreenSizeGroup } from "./ScreenSizeGroup";

/**
 * With the Move tool, the selection gets one gizmo: arrows to move along an axis
 * and rings to rotate about it. It sits at the selection centre and follows any drag preview.
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
			<RotateRings origin={origin} />
		</ScreenSizeGroup>
	);
}
