import { Edges } from "@react-three/drei";
import { type ThreeEvent, useThree } from "@react-three/fiber";
import { Color } from "three";
import { commands } from "@/commands";
import { faceFromLocalNormal } from "@/geometry/box";
import { extrudableDimension } from "@/geometry/extrude";
import { pieceSize } from "@/model/dimensions";
import type { Piece } from "@/model/types";
import { isGizmoObject } from "@/scene/gizmoStyle";
import { pickEdge } from "@/scene/pickEdge";
import { applyCommand, useAppStore } from "@/state/store";
import { measureClick } from "@/tools/measureSession";

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

/**
 * Draws one piece as a box. Click selects the face under the cursor (or the whole piece, if that
 * face can't be extruded); double-click selects the piece. Shift adds to / removes from the selection.
 */
export function PieceMesh({ piece, selected, ghost }: Props) {
	const size = pieceSize(piece);
	const viewport = useThree((st) => st.size);
	const { position: p, rotation: r } = piece;

	const onClick = (e: ThreeEvent<MouseEvent>) => {
		// Gizmo parts (drawn on top) get the click even if the piece is nearer: let it through to them.
		if (e.intersections.some((i) => isGizmoObject(i.object))) return;
		e.stopPropagation();
		// Ignore the "click" that ends a drag (e.g. releasing a gizmo handle over the piece).
		if (e.delta > CLICK_SLOP || ghost) return;
		// Use this box's own hit (not its edge lines) to find which face was clicked.
		const hit = e.intersections.find((i) => i.object === e.eventObject);
		if (!hit?.face) return;
		const face = faceFromLocalNormal(piece.id, hit.face.normal);
		// Measure tool: the click picks the edge of this face nearest the pointer; nothing gets selected.
		if (useAppStore.getState().tool === "measure") {
			measureClick(pickEdge(piece, face, e.camera, e.pointer, viewport));
			return;
		}
		const shift = e.nativeEvent.shiftKey;
		const piecesSelected = useAppStore.getState().doc.selection.length > 0;
		// Shift+click while pieces are selected adds/removes this whole piece (multi-select to move/rotate).
		if (shift && piecesSelected) {
			applyCommand(commands.togglePiece(piece.id));
			return;
		}
		// A face that can't be extruded (sheet top, rail side) selects the whole piece instead.
		if (!extrudableDimension(piece, face)) {
			applyCommand(
				shift
					? commands.togglePiece(piece.id)
					: commands.selectPieces([piece.id]),
			);
			return;
		}
		// Otherwise Shift+click adds/removes a face, for extruding several together.
		applyCommand(
			shift ? commands.toggleFace(face) : commands.selectFaces([face]),
		);
	};

	// Measure tool: highlight the edge nearest the pointer, so you can see what a click will pick.
	const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
		const { tool, setMeasureHover } = useAppStore.getState();
		if (tool !== "measure" || ghost) return;
		const hit = e.intersections.find((i) => i.object === e.eventObject);
		if (!hit?.face) return;
		e.stopPropagation();
		const face = faceFromLocalNormal(piece.id, hit.face.normal);
		setMeasureHover(pickEdge(piece, face, e.camera, e.pointer, viewport));
	};

	const onPointerOut = () => {
		const { measureHover, setMeasureHover } = useAppStore.getState();
		if (measureHover?.pieceId === piece.id) setMeasureHover(null);
	};

	const onDoubleClick = (e: ThreeEvent<MouseEvent>) => {
		e.stopPropagation();
		// With Shift, the two clicks before this already toggled the piece in and out; toggle it back.
		if (ghost || useAppStore.getState().tool === "measure") return;
		applyCommand(
			e.nativeEvent.shiftKey
				? commands.togglePiece(piece.id)
				: commands.selectPieces([piece.id]),
		);
	};

	return (
		<mesh
			position={[p.x, p.y, p.z]}
			rotation={[r.x * DEG, r.y * DEG, r.z * DEG]}
			onClick={onClick}
			onPointerMove={onPointerMove}
			onPointerOut={onPointerOut}
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
