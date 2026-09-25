import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { faceCorners } from "@/geometry/box";
import { dot, sub, type Vec3 } from "@/geometry/vec";
import { SNAP_COLOR } from "@/scene/gizmoStyle";
import { useAppStore } from "@/state/store";

/** Tints the face being snapped to and outlines it with a dashed line, during a drag or extrude. */
export function SnapGuide() {
	const target = useAppStore(
		(s) => s.drag?.snapTarget?.face ?? s.extrude?.snapTarget?.face,
	);
	const piece = useAppStore((s) =>
		target ? s.doc.pieces[target.pieceId] : undefined,
	);
	const corners = useMemo(
		() =>
			target && piece ? faceCorners(piece, target.axis, target.sign) : null,
		[target, piece],
	);
	const fill = useMemo(() => {
		if (!corners) return null;
		const [a, b, c, d] = corners;
		const g = new BufferGeometry();
		// Both windings, so the tint shows from either side.
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
	if (!corners || !fill) return null;

	const points = [...corners, corners[0]].map((c): [number, number, number] => [
		c.x,
		c.y,
		c.z,
	]);
	// Dash length relative to the face, so small and large faces both read as dashed.
	const side = Math.min(
		length(sub(corners[1], corners[0])),
		length(sub(corners[2], corners[1])),
	);
	const dash = Math.min(40, Math.max(4, side / 10));
	return (
		<group>
			<mesh geometry={fill} renderOrder={998}>
				<meshBasicMaterial
					color={SNAP_COLOR}
					transparent
					opacity={0.18}
					depthTest={false}
					depthWrite={false}
					toneMapped={false}
				/>
			</mesh>
			<Line
				points={points}
				color={SNAP_COLOR}
				lineWidth={3}
				dashed
				dashSize={dash}
				gapSize={dash * 0.6}
				depthTest={false}
				renderOrder={999}
			/>
		</group>
	);
}

const length = (v: Vec3) => Math.sqrt(dot(v, v));
