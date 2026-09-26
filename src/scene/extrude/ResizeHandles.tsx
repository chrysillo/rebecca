import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import {
	type Camera,
	DoubleSide,
	type Group,
	Quaternion,
	Vector3,
} from "three";
import { HANDLE_HOVER_COLOR } from "@/colors";
import { type FaceRef, faceCentre, faceNormal, sameFace } from "@/geometry/box";
import { extrudableFaces } from "@/geometry/extrude";
import type { Vec3 } from "@/geometry/vec";
import type { Piece } from "@/model/types";
import { useExtrudeDrag } from "@/scene/extrude/useExtrudeDrag";
import {
	GIZMO_REACH,
	GIZMO_RENDER_ORDER,
	GIZMO_USER_DATA,
	gizmoMaterialProps,
	HANDLE_HIT_RADIUS,
} from "@/scene/shared/gizmoStyle";
import { ScreenSizeGroup, screenScale } from "@/scene/shared/ScreenSizeGroup";
import {
	extrudePreview,
	selectedPieces,
	selectionPivot,
} from "@/state/selectors";
import { useAppStore } from "@/state/store";
import { beginExtrude } from "@/tools/extrudeSession";

/** Layout in gizmo units (~130 px): the least gap between face and handle, and the handle's size. */
const GAP = 0.1;
const HEAD_LENGTH = 0.09;
const HEAD_RADIUS = 0.04;
const STEM_RADIUS = 0.006;
/** Faint, so a stem crossing the gizmo doesn't read as one of its axes. */
const STEM_OPACITY = 0.35;
/** Furthest a handle is pushed out to clear the gizmo, and the step used to find that spot. */
const MAX_OFFSET = 2.5;
const OFFSET_STEP = 0.02;
/** Violet: apart from the gizmo's red/green/blue axes, its white pivot dot and the teal measurements. */
const HANDLE_COLOR = "#8b5cf6";
/** Above this |cos| between a face's normal and the view, it faces the camera and its handle hides. */
const HEAD_ON = 0.9;

/**
 * With one piece selected, a small arrow outside each face that can be extruded (a sheet's four
 * edges, a rail's two ends). Dragging one resizes the piece from that side, so the thin edge of a
 * sheet never has to be clicked. The piece stays selected afterwards. Handles keep clear of the
 * move/rotate gizmo, sliding further out along their face's normal when it's in the way.
 */
export function ResizeHandles() {
	const tool = useAppStore((s) => s.tool);
	const doc = useAppStore((s) => s.doc);
	const extrude = useAppStore((s) => s.extrude);
	const busy = useAppStore((s) => s.drag !== null || s.joiner !== null);
	const preview = useMemo(() => extrudePreview(doc, extrude), [doc, extrude]);

	const pieces = selectedPieces(doc);
	if (tool !== "select" || busy || pieces.length !== 1) return null;
	const piece = preview[pieces[0].id] ?? pieces[0];
	// Where the gizmo sits before any extrude, so a dragged handle doesn't jump as the piece grows.
	const gizmo = selectionPivot(pieces, doc.groupPivot);

	return extrudableFaces(piece).map((face) => {
		// While extruding, only the handle being dragged stays (E has its own feedback).
		const dragged =
			extrude?.choices.length === 0 && sameFace(extrude.faces[0], face);
		if (extrude && !dragged) return null;
		return (
			<ResizeHandle
				key={`${face.axis}${face.sign}`}
				piece={piece}
				face={face}
				gizmo={gizmo}
			/>
		);
	});
}

function ResizeHandle({
	piece,
	face,
	gizmo,
}: {
	piece: Piece;
	face: FaceRef;
	gizmo: Vec3;
}) {
	const [hovered, setHovered] = useState(false);
	const [headOn, setHeadOn] = useState(false);
	const tip = useRef<Group>(null);
	const stem = useRef<Group>(null);
	const size = useThree((s) => s.size);
	const { dragging, onPointerDown, onPointerUp } = useExtrudeDrag(() =>
		beginExtrude([face]),
	);

	const c = faceCentre(piece, face);
	const n = faceNormal(piece, face.axis, face.sign);
	const centre = new Vector3(c.x, c.y, c.z);
	const normal = new Vector3(n.x, n.y, n.z);

	useFrame(({ camera }) => {
		// A face turned towards the camera would put its handle over the middle of the piece.
		const view = camera.position.clone().sub(centre).normalize();
		const next = !dragging && Math.abs(view.dot(normal)) > HEAD_ON;
		if (next !== headOn) setHeadOn(next);
		// Held still while dragged, so the handle stays under the pointer.
		if (!tip.current || !stem.current || dragging) return;

		const offset = clearOffset(camera, size, centre, normal, gizmo);
		tip.current.position.y = offset;
		stem.current.scale.y = offset;
	});
	if (headOn) return null;

	const turn = new Quaternion().setFromUnitVectors(
		new Vector3(0, 1, 0),
		normal,
	);
	const color = hovered || dragging ? HANDLE_HOVER_COLOR : HANDLE_COLOR;
	return (
		<ScreenSizeGroup position={c}>
			<group quaternion={turn}>
				{/* A thin stem ties a pushed-out handle back to its face. */}
				<group ref={stem} scale={[1, GAP, 1]}>
					<mesh position={[0, 0.5, 0]} renderOrder={GIZMO_RENDER_ORDER}>
						<cylinderGeometry args={[STEM_RADIUS, STEM_RADIUS, 1, 6]} />
						<meshBasicMaterial
							{...gizmoMaterialProps(color)}
							opacity={STEM_OPACITY}
						/>
					</mesh>
				</group>
				<group ref={tip} position={[0, GAP, 0]}>
					<mesh
						position={[0, HEAD_LENGTH / 2, 0]}
						renderOrder={GIZMO_RENDER_ORDER}
					>
						<coneGeometry args={[HEAD_RADIUS, HEAD_LENGTH, 16]} />
						<meshBasicMaterial {...gizmoMaterialProps(color)} />
					</mesh>
					<mesh
						position={[0, HEAD_LENGTH / 2, 0]}
						userData={GIZMO_USER_DATA}
						onPointerDown={onPointerDown}
						onPointerUp={onPointerUp}
						onPointerOver={() => setHovered(true)}
						onPointerOut={() => setHovered(false)}
					>
						<sphereGeometry args={[HANDLE_HIT_RADIUS, 12, 8]} />
						<meshBasicMaterial
							transparent
							opacity={0}
							depthWrite={false}
							side={DoubleSide}
						/>
					</mesh>
				</group>
			</group>
		</ScreenSizeGroup>
	);
}

/**
 * How far out (gizmo units) along the face normal the handle must sit so that, on screen, it
 * doesn't overlap the gizmo: the least offset from GAP whose handle is beyond the gizmo's reach.
 */
function clearOffset(
	camera: Camera,
	size: { width: number; height: number },
	centre: Vector3,
	normal: Vector3,
	gizmo: Vec3,
): number {
	const toPixels = (p: Vector3) => {
		const v = p.clone().project(camera);
		return { x: (v.x * size.width) / 2, y: (v.y * size.height) / 2 };
	};
	const origin = new Vector3(gizmo.x, gizmo.y, gizmo.z);
	const o = toPixels(origin);
	// One gizmo unit in pixels, measured sideways on screen at the gizmo.
	const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
	const unit = toPixels(
		origin.clone().addScaledVector(right, screenScale(camera, origin)),
	);
	const clear =
		Math.hypot(unit.x - o.x, unit.y - o.y) * (GIZMO_REACH + HANDLE_HIT_RADIUS);

	const scale = screenScale(camera, centre);
	for (let u = GAP; u < MAX_OFFSET; u += OFFSET_STEP) {
		const at = toPixels(
			centre.clone().addScaledVector(normal, (u + HEAD_LENGTH / 2) * scale),
		);
		if (Math.hypot(at.x - o.x, at.y - o.y) >= clear) return u;
	}
	return MAX_OFFSET;
}
