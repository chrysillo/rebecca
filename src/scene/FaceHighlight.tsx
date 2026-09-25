import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { faceCorners } from "../geometry/box";
import { shownPiece } from "../state/selectors";
import { useAppStore } from "../state/store";

const FACE_COLOR = "#3b82f6";

/** Tints and outlines the selected face (following it while it is extruded). */
export function FaceHighlight() {
	const doc = useAppStore((s) => s.doc);
	const extrude = useAppStore((s) => s.extrude);
	const face = doc.selectedFace;
	// While extruding, the highlight rides on the moving face.
	const piece = useMemo(
		() => (face ? shownPiece(doc, extrude, face.pieceId) : undefined),
		[doc, extrude, face],
	);

	const corners = useMemo(
		() => (face && piece ? faceCorners(piece, face.axis, face.sign) : null),
		[face, piece],
	);
	const geometry = useMemo(() => {
		if (!corners) return null;
		const [a, b, c, d] = corners;
		const g = new BufferGeometry();
		// Two triangles, both windings, so the tint shows from either side.
		const tri = [a, b, c, a, c, d, a, c, b, a, d, c];
		g.setAttribute(
			"position",
			new Float32BufferAttribute(
				tri.flatMap((p) => [p.x, p.y, p.z]),
				3,
			),
		);
		return g;
	}, [corners]);

	if (!corners || !geometry) return null;
	const outline = [...corners, corners[0]].map(
		(p): [number, number, number] => [p.x, p.y, p.z],
	);

	return (
		<group>
			<mesh geometry={geometry} renderOrder={10}>
				<meshBasicMaterial
					color={FACE_COLOR}
					transparent
					opacity={0.45}
					depthWrite={false}
					polygonOffset
					polygonOffsetFactor={-2}
					toneMapped={false}
				/>
			</mesh>
			<Line
				points={outline}
				color={FACE_COLOR}
				lineWidth={2.5}
				renderOrder={11}
			/>
		</group>
	);
}
