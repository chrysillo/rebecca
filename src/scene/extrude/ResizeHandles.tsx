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
import { type FaceRef, faceCentre, faceNormal } from "@/geometry/box";
import { coplanarFaceGroups } from "@/geometry/extrude";
import { add, scale, type Vec3 } from "@/geometry/vec";
import { useExtrudeDrag } from "@/scene/extrude/useExtrudeDrag";
import { SolidArrow } from "@/scene/shared/gizmoShapes";
import {
	DIM_OPACITY,
	GIZMO_REACH,
	GIZMO_RENDER_ORDER,
	GIZMO_USER_DATA,
	gizmoMaterialProps,
	HANDLE_HIT_RADIUS,
} from "@/scene/shared/gizmoStyle";
import { ScreenSizeGroup, screenScale } from "@/scene/shared/ScreenSizeGroup";
import { useGizmoHover } from "@/scene/shared/useGizmoHover";
import {
	extrudePreview,
	selectedPieces,
	selectionPivot,
} from "@/state/selectors";
import { useAppStore } from "@/state/store";
import { beginExtrude } from "@/tools/extrudeSession";

/** Layout in gizmo units (~130 px): the least gap between face and arrow, and the arrow's length. */
const GAP = 0.07;
const ARROW_LENGTH = 0.18;
/** The stem that ties a pushed-out arrow back to its face. Faint, so it doesn't read as a gizmo axis. */
const STEM_RADIUS = 0.006;
const STEM_OPACITY = 0.35;
/** Furthest a handle is pushed out to clear the gizmo, and the step used to find that spot. */
const MAX_OFFSET = 2.5;
const OFFSET_STEP = 0.02;
/** Neutral grey: apart from the gizmo's axis colours and quieter than black. */
const RESIZE_COLOR = "#737373";
/** Above this |cos| between a face's normal and the view, it faces the camera and its handle hides. */
const HEAD_ON = 0.9;

/**
 * A small arrow outside each face of the selection that can be extruded (a sheet's four edges, a
 * rail's two ends). With several pieces selected, one arrow per plane that every piece has a face
 * in, e.g. the tops of four legs. Dragging one resizes from that side, so the thin edge of a
 * sheet never has to be clicked. The pieces stay selected afterwards. Handles keep clear of the
 * move/rotate gizmo, sliding further out along their face's normal when it's in the way.
 */
export function ResizeHandles() {
	const tool = useAppStore((s) => s.tool);
	const doc = useAppStore((s) => s.doc);
	const extrude = useAppStore((s) => s.extrude);
	const busy = useAppStore((s) => s.drag !== null || s.joiner !== null);
	const preview = useMemo(() => extrudePreview(doc, extrude), [doc, extrude]);

	const selected = selectedPieces(doc);
	if (tool !== "select" || busy || selected.length === 0) return null;
	const pieces = selected.map((p) => preview[p.id] ?? p);
	// Where the gizmo sits before any extrude, so a dragged handle doesn't jump as the pieces grow.
	const gizmo = selectionPivot(selected, doc.groupPivot);

	// While extruding, only the handle being dragged stays (E has its own feedback).
	const groups = extrude
		? extrude.choices.length === 0
			? [extrude.faces]
			: []
		: coplanarFaceGroups(pieces).filter((group) =>
				pieces.every((p) => group.some((f) => f.pieceId === p.id)),
			);
	return groups.map((faces) => {
		const centres = faces.flatMap((f) => {
			const piece = pieces.find((p) => p.id === f.pieceId);
			return piece ? [faceCentre(piece, f)] : [];
		});
		const piece = pieces.find((p) => p.id === faces[0].pieceId);
		if (!piece || centres.length < faces.length) return null;
		// Keyed on the first face, which the drag keeps, so the dragged handle isn't remounted.
		return (
			<ResizeHandle
				key={`${faces[0].pieceId}:${faces[0].axis}${faces[0].sign}`}
				faces={faces}
				centre={scale(centres.reduce(add), 1 / centres.length)}
				normal={faceNormal(piece, faces[0].axis, faces[0].sign)}
				gizmo={gizmo}
			/>
		);
	});
}

function ResizeHandle({
	faces,
	centre: c,
	normal: n,
	gizmo,
}: {
	faces: FaceRef[];
	/** Middle of the faces, where the handle's stem starts. */
	centre: Vec3;
	normal: Vec3;
	gizmo: Vec3;
}) {
	const hover = useGizmoHover(
		`resize:${faces[0].pieceId}:${faces[0].axis}${faces[0].sign}`,
	);
	const [headOn, setHeadOn] = useState(false);
	const tip = useRef<Group>(null);
	const stem = useRef<Group>(null);
	const size = useThree((s) => s.size);
	const { dragging, onPointerDown, onPointerUp } = useExtrudeDrag(() =>
		beginExtrude(faces),
	);

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
		// Only an arrow pushed out past the gizmo needs its stem.
		stem.current.visible = offset > GAP + OFFSET_STEP / 2;
	});
	if (headOn) return null;

	const turn = new Quaternion().setFromUnitVectors(
		new Vector3(0, 1, 0),
		normal,
	);
	const color = hover.hovered || dragging ? HANDLE_HOVER_COLOR : RESIZE_COLOR;
	const opacity = hover.dim && !dragging ? DIM_OPACITY : 1;
	return (
		<ScreenSizeGroup position={c}>
			<group quaternion={turn}>
				{/* A thin stem ties a pushed-out handle back to its face. */}
				<group ref={stem} scale={[1, GAP, 1]}>
					<mesh position={[0, 0.5, 0]} renderOrder={GIZMO_RENDER_ORDER - 3}>
						<cylinderGeometry args={[STEM_RADIUS, STEM_RADIUS, 1, 6]} />
						<meshBasicMaterial
							{...gizmoMaterialProps(RESIZE_COLOR)}
							opacity={STEM_OPACITY * opacity}
						/>
					</mesh>
				</group>
				<group ref={tip} position={[0, GAP, 0]}>
					<SolidArrow
						from={[0, 0, 0]}
						to={[0, ARROW_LENGTH, 0]}
						color={color}
						opacity={opacity}
					/>
					<mesh
						position={[0, ARROW_LENGTH / 2, 0]}
						userData={GIZMO_USER_DATA}
						onPointerDown={onPointerDown}
						onPointerUp={onPointerUp}
						onPointerOver={hover.onPointerOver}
						onPointerOut={hover.onPointerOut}
					>
						<cylinderGeometry
							args={[
								HANDLE_HIT_RADIUS,
								HANDLE_HIT_RADIUS,
								ARROW_LENGTH + HANDLE_HIT_RADIUS,
								8,
							]}
						/>
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
			centre.clone().addScaledVector(normal, (u + ARROW_LENGTH / 2) * scale),
		);
		if (Math.hypot(at.x - o.x, at.y - o.y) >= clear) return u;
	}
	return MAX_OFFSET;
}
