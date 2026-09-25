import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { SELECTION_COLOR } from "@/colors";
import { type FaceRef, faceCorners } from "@/geometry/box";
import type { Piece } from "@/model/types";
import { extrudePreview } from "@/state/selectors";
import { useAppStore } from "@/state/store";

/** Tints and outlines every selected face (following them while they are extruded). */
export function FaceHighlight() {
	const doc = useAppStore((s) => s.doc);
	const extrude = useAppStore((s) => s.extrude);
	const preview = useMemo(() => extrudePreview(doc, extrude), [doc, extrude]);

	return doc.selectedFaces.map((face) => {
		const piece = preview[face.pieceId] ?? doc.pieces[face.pieceId];
		return piece ? (
			<FaceTint
				key={`${face.pieceId}:${face.axis}${face.sign}`}
				piece={piece}
				face={face}
			/>
		) : null;
	});
}

/** Tints and outlines one face. Also used for the first face of a measurement in progress. */
export function FaceTint({
	piece,
	face,
	color = SELECTION_COLOR,
}: {
	piece: Piece;
	face: FaceRef;
	color?: string;
}) {
	const corners = useMemo(
		() => faceCorners(piece, face.axis, face.sign),
		[piece, face],
	);
	const geometry = useMemo(() => {
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

	const outline = [...corners, corners[0]].map(
		(p): [number, number, number] => [p.x, p.y, p.z],
	);

	return (
		<group>
			<mesh geometry={geometry} renderOrder={10}>
				<meshBasicMaterial
					color={color}
					transparent
					opacity={0.45}
					depthWrite={false}
					polygonOffset
					polygonOffsetFactor={-2}
					toneMapped={false}
				/>
			</mesh>
			<Line points={outline} color={color} lineWidth={2.5} renderOrder={11} />
		</group>
	);
}
