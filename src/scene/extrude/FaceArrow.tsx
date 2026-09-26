import { useMemo, useState } from "react";
import { DoubleSide, Quaternion, Vector3 } from "three";
import { HANDLE_HOVER_COLOR, SELECTION_COLOR } from "@/colors";
import { faceCentre, faceNormal } from "@/geometry/box";
import { useExtrudeDrag } from "@/scene/extrude/useExtrudeDrag";
import {
	GIZMO_RENDER_ORDER,
	GIZMO_USER_DATA,
	gizmoMaterialProps,
	HANDLE_HIT_RADIUS,
} from "@/scene/shared/gizmoStyle";
import { ScreenSizeGroup } from "@/scene/shared/ScreenSizeGroup";
import { extrudePreview } from "@/state/selectors";
import { useAppStore } from "@/state/store";
import { startExtrude } from "@/tools/extrudeSession";

/** Layout along the arrow, in gizmo units: a shaft through the face with a head at each end. */
const HALF_SHAFT = 0.5;
const HEAD_LENGTH = 0.14;
const HIT_HALF = 0.72;

/**
 * A double-headed arrow on the last selected face, along its normal. Dragging it extrudes the
 * selected face(s) either way (out grows the piece, in shrinks it); releasing applies the extrude.
 */
export function FaceArrow() {
	const tool = useAppStore((s) => s.tool);
	const doc = useAppStore((s) => s.doc);
	const extrude = useAppStore((s) => s.extrude);
	const [hovered, setHovered] = useState(false);
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

	const color = hovered || dragging ? HANDLE_HOVER_COLOR : SELECTION_COLOR;
	return (
		<ScreenSizeGroup position={centre}>
			<group quaternion={turn}>
				<mesh renderOrder={GIZMO_RENDER_ORDER}>
					<cylinderGeometry args={[0.008, 0.008, HALF_SHAFT * 2, 8]} />
					<meshBasicMaterial {...gizmoMaterialProps(color)} />
				</mesh>
				{([1, -1] as const).map((end) => (
					<mesh
						key={end}
						position={[0, end * (HALF_SHAFT + HEAD_LENGTH / 2), 0]}
						rotation={[end === 1 ? 0 : Math.PI, 0, 0]}
						renderOrder={GIZMO_RENDER_ORDER}
					>
						<coneGeometry args={[0.038, HEAD_LENGTH, 20]} />
						<meshBasicMaterial {...gizmoMaterialProps(color)} />
					</mesh>
				))}
				<mesh
					userData={GIZMO_USER_DATA}
					onPointerDown={onPointerDown}
					onPointerUp={onPointerUp}
					onPointerOver={() => setHovered(true)}
					onPointerOut={() => setHovered(false)}
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
