import { Line } from "@react-three/drei";
import { faceCorners } from "../geometry/box";
import { useAppStore } from "../state/store";

/** Outlines the face being snapped to during a drag or extrude. */
export function SnapGuide() {
	const target = useAppStore(
		(s) => s.drag?.snapTarget?.face ?? s.extrude?.snapTarget?.face,
	);
	const piece = useAppStore((s) =>
		target ? s.doc.pieces[target.pieceId] : undefined,
	);
	if (!target || !piece) return null;

	const corners = faceCorners(piece, target.axis, target.sign);
	const points = [...corners, corners[0]].map((c): [number, number, number] => [
		c.x,
		c.y,
		c.z,
	]);
	return (
		<Line
			points={points}
			color="#e8590c"
			lineWidth={3}
			depthTest={false}
			renderOrder={999}
		/>
	);
}
