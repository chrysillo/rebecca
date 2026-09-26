import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { SNAP_COLOR } from "@/colors";
import { type FacePlane, faceCentre, faceCorners } from "@/geometry/box";
import { dot, scale, sub, type Vec3 } from "@/geometry/vec";
import { primaryFace } from "@/state/extrude";
import {
	centreOf,
	extrudePreview,
	selectedPiecesPreviewed,
} from "@/state/selectors";
import { useAppStore } from "@/state/store";

type Point = [number, number, number];
const toPoint = (v: Vec3): Point => [v.x, v.y, v.z];

/**
 * During a drag or extrude: tints and outlines the face being snapped to, and draws a dashed line
 * from the moving object to where it snaps.
 */
export function SnapGuide() {
	const snap = useAppStore(
		(s) => s.drag?.snapTarget ?? s.extrude?.snapTarget ?? null,
	);
	const target = snap?.face ?? null;
	const piece = useAppStore((s) =>
		target ? s.doc.pieces[target.pieceId] : undefined,
	);
	const from = useMovingPoint(snap !== null);
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
	if (!snap) return null;

	// Towards the target face's centre, or straight down onto the floor.
	const to =
		target && piece ? faceCentre(piece, target) : projectOnto(snap, from);
	const lead = from && to ? length(sub(to, from)) : 0;
	// Dash length relative to the line, so short and long leads both read as dashed.
	const dash = Math.min(40, Math.max(3, lead / 12));
	return (
		<group>
			{corners && fill && (
				<>
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
						points={[...corners, corners[0]].map(toPoint)}
						color={SNAP_COLOR}
						lineWidth={3}
						depthTest={false}
						renderOrder={999}
					/>
				</>
			)}
			{from && to && lead > 1e-3 && (
				<Line
					points={[toPoint(from), toPoint(to)]}
					color={SNAP_COLOR}
					lineWidth={2}
					dashed
					dashSize={dash}
					gapSize={dash * 0.7}
					depthTest={false}
					renderOrder={999}
				/>
			)}
		</group>
	);
}

/** Where the lead line starts: the dragged pieces' centre, or the extruded face's centre. */
function useMovingPoint(active: boolean): Vec3 | null {
	const doc = useAppStore((s) => s.doc);
	const drag = useAppStore((s) => s.drag);
	const extrude = useAppStore((s) => s.extrude);
	return useMemo(() => {
		if (!active) return null;
		if (drag) {
			const pieces = selectedPiecesPreviewed(doc, drag);
			return pieces.length ? centreOf(pieces) : null;
		}
		if (extrude) {
			const face = primaryFace(extrude);
			const piece =
				extrudePreview(doc, extrude)[face.pieceId] ?? doc.pieces[face.pieceId];
			return piece ? faceCentre(piece, face) : null;
		}
		return null;
	}, [active, doc, drag, extrude]);
}

/** The foot of the perpendicular from `p` onto a plane. */
function projectOnto(plane: FacePlane, p: Vec3 | null): Vec3 | null {
	if (!p) return null;
	return sub(p, scale(plane.normal, dot(plane.normal, p) - plane.offset));
}

const length = (v: Vec3) => Math.sqrt(dot(v, v));
