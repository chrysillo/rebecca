import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { Color } from "three";
import { commands } from "../commands";
import { faceFromLocalNormal } from "../geometry/box";
import { pieceSize } from "../model/dimensions";
import type { Piece } from "../model/types";
import { applyCommand } from "../state/store";
import { isGizmoObject } from "./gizmoStyle";

const DEG = Math.PI / 180;

const COLORS = {
	sheet: "#dcc196",
	framing: "#c99a63",
} as const;

/** Selected pieces keep a hint of their wood colour under a light blue tint. */
const SELECTED_TINT = "#9ccaff";
const SELECTED_COLORS = {
	sheet: new Color(COLORS.sheet).lerp(new Color(SELECTED_TINT), 0.7),
	framing: new Color(COLORS.framing).lerp(new Color(SELECTED_TINT), 0.7),
};
const SELECTED_EDGE = "#2563eb";

/** Max pointer travel (px) between press and release for it to count as a click. */
const CLICK_SLOP = 3;

type Props = { piece: Piece; selected: boolean; ghost: boolean };

/** Draws one piece as a box. Click selects the face under the cursor; double-click selects the piece. */
export function PieceMesh({ piece, selected, ghost }: Props) {
	const size = pieceSize(piece);
	const { position: p, rotation: r } = piece;

	const onClick = (e: ThreeEvent<MouseEvent>) => {
		e.stopPropagation();
		// Ignore the "click" that ends a drag (e.g. releasing a gizmo handle over the piece).
		if (e.delta > CLICK_SLOP) return;
		if (ghost || e.intersections.some((i) => isGizmoObject(i.object))) return;
		// Use this box's own hit (not its edge lines) to find which face was clicked.
		const hit = e.intersections.find((i) => i.object === e.eventObject);
		if (!hit?.face) return;
		applyCommand(
			commands.selectFace(faceFromLocalNormal(piece.id, hit.face.normal)),
		);
	};

	const onDoubleClick = (e: ThreeEvent<MouseEvent>) => {
		e.stopPropagation();
		if (!ghost) applyCommand(commands.selectPieces([piece.id]));
	};

	return (
		<mesh
			position={[p.x, p.y, p.z]}
			rotation={[r.x * DEG, r.y * DEG, r.z * DEG]}
			onClick={onClick}
			onDoubleClick={onDoubleClick}
		>
			<boxGeometry args={[size.x, size.y, size.z]} />
			<meshStandardMaterial
				color={selected ? SELECTED_COLORS[piece.kind] : COLORS[piece.kind]}
				transparent={ghost}
				opacity={ghost ? 0.6 : 1}
				polygonOffset
				polygonOffsetFactor={1}
			/>
			<Edges
				color={selected ? SELECTED_EDGE : "#5c4a32"}
				lineWidth={selected ? 2.5 : 1}
			/>
		</mesh>
	);
}
