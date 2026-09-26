import { useMemo } from "react";
import { DoubleSide, Quaternion, Vector3 } from "three";
import { HANDLE_HOVER_COLOR, SELECTION_COLOR } from "@/colors";
import { faceCentre, faceNormal } from "@/geometry/box";
import { useExtrudeDrag } from "@/scene/extrude/useExtrudeDrag";
import { SolidArrow } from "@/scene/shared/gizmoShapes";
import {
	DIM_OPACITY,
	GIZMO_USER_DATA,
	HANDLE_HIT_RADIUS,
} from "@/scene/shared/gizmoStyle";
import { ScreenSizeGroup } from "@/scene/shared/ScreenSizeGroup";
import { useGizmoHover } from "@/scene/shared/useGizmoHover";
import { extrudePreview } from "@/state/selectors";
import { useAppStore } from "@/state/store";
import { startExtrude } from "@/tools/extrudeSession";

/** Half the arrow's length (tips included), in gizmo units, and of its grab area. */
const HALF_LENGTH = 0.3;
const HIT_HALF = 0.36;

/**
 * A solid double-headed arrow on the last selected face, along its normal. Dragging it extrudes the
 * selected face(s) either way (out grows the piece, in shrinks it); releasing applies the extrude.
 */
export function FaceArrow() {
	const tool = useAppStore((s) => s.tool);
	const doc = useAppStore((s) => s.doc);
	const extrude = useAppStore((s) => s.extrude);
	const hover = useGizmoHover("face");
	const { dragging, onPointerDown, onPointerUp } = useExtrudeDrag(startExtrude);

	const face = doc.selectedFaces[doc.selectedFaces.length - 1];
	const preview = useMemo(() => extrudePreview(doc, extrude), [doc, extrude]);
	const piece = face
		? (preview[face.pieceId] ?? doc.pieces[face.pieceId])
		: undefined;
	// E (follow-the-mouse extrude) has its own feedback; the arrow is only for dragging.
	if (tool !== "select" || !face || !piece || (extrude && !dragging))
		return null;

	const centre = faceCentre(piece, face);
	const normal = faceNormal(piece, face.axis, face.sign);
	const turn = new Quaternion().setFromUnitVectors(
		new Vector3(0, 1, 0),
		new Vector3(normal.x, normal.y, normal.z),
	);

	const color =
		hover.hovered || dragging ? HANDLE_HOVER_COLOR : SELECTION_COLOR;
	return (
		<ScreenSizeGroup position={centre}>
			<group quaternion={turn}>
				<SolidArrow
					from={[0, -HALF_LENGTH, 0]}
					to={[0, HALF_LENGTH, 0]}
					color={color}
					opacity={hover.dim && !dragging ? DIM_OPACITY : 1}
					twoHeads
				/>
				<mesh
					userData={GIZMO_USER_DATA}
					onPointerDown={onPointerDown}
					onPointerUp={onPointerUp}
					onPointerOver={hover.onPointerOver}
					onPointerOut={hover.onPointerOut}
				>
					<cylinderGeometry
						args={[HANDLE_HIT_RADIUS, HANDLE_HIT_RADIUS, HIT_HALF * 2, 8]}
					/>
					<meshBasicMaterial
						transparent
						opacity={0}
						depthWrite={false}
						side={DoubleSide}
					/>
				</mesh>
			</group>
		</ScreenSizeGroup>
	);
}
