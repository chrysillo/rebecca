import { Line } from "@react-three/drei";
import { type ThreeEvent, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
	BoxGeometry,
	type BufferGeometry,
	Color,
	type Intersection,
} from "three";
import { commands } from "@/commands";
import {
	type FaceRef,
	faceFromLocalNormal,
	rotateVector,
} from "@/geometry/box";
import { cutGeometry } from "@/geometry/cut";
import { featureEdges } from "@/geometry/edges";
import { extrudableDimension } from "@/geometry/extrude";
import type { Vec3 } from "@/geometry/vec";
import { pieceSize } from "@/model/dimensions";
import { groupOf } from "@/model/group";
import type { Piece } from "@/model/types";
import { isGizmoObject } from "@/scene/gizmoStyle";
import { pickEdge } from "@/scene/pickEdge";
import { usePlaneDrag } from "@/scene/usePlaneDrag";
import { applyCommand, useAppStore } from "@/state/store";
import { armContextMenu } from "@/tools/contextMenuSession";
import { measureClick } from "@/tools/measureSession";

const DEG = Math.PI / 180;

const COLORS = {
	sheet: "#dcc196",
	framing: "#c99a63",
} as const;

/** Selected pieces keep their wood colour under a light amber tint, outlined in the UI's amber accent. */
const SELECTED_TINT = "#fcd34d";
const SELECTED_COLORS = {
	sheet: new Color(COLORS.sheet).lerp(new Color(SELECTED_TINT), 0.35),
	framing: new Color(COLORS.framing).lerp(new Color(SELECTED_TINT), 0.35),
};
const SELECTED_EDGE = "#f59e0b";

/** Under the pointer (or its right-click menu open): lifted towards white, with a darker amber edge. */
const HOVER_TINT = "#fff7e6";
const HOVER_COLORS = {
	sheet: new Color(COLORS.sheet).lerp(new Color(HOVER_TINT), 0.35),
	framing: new Color(COLORS.framing).lerp(new Color(HOVER_TINT), 0.35),
};
const HOVER_SELECTED_COLORS = {
	sheet: SELECTED_COLORS.sheet.clone().lerp(new Color(HOVER_TINT), 0.3),
	framing: SELECTED_COLORS.framing.clone().lerp(new Color(HOVER_TINT), 0.3),
};
const HOVER_EDGE = "#d97706";

/** Join wheel preview: the piece to be cut glows amber; the pieces cutting it (pulled clear) are faded. */
const JOIN_TARGET_TINT = "#f5a524";
const JOIN_TARGET_COLORS = {
	sheet: new Color(COLORS.sheet).lerp(new Color(JOIN_TARGET_TINT), 0.65),
	framing: new Color(COLORS.framing).lerp(new Color(JOIN_TARGET_TINT), 0.65),
};
const JOIN_TARGET_EDGE = "#b45309";
const JOIN_TOOL_OPACITY = 0.4;

/** Max pointer travel (px) between press and release for it to count as a click. */
const CLICK_SLOP = 3;

/** How near (mm) a hit must be to the box's outside to count as that face rather than inside a cut. */
const SURFACE_TOLERANCE = 0.05;

type Props = {
	piece: Piece;
	selected: boolean;
	/** Under the pointer, or the piece a right-click menu is open for. */
	hovered?: boolean;
	ghost: boolean;
	cutters: Piece[];
	joinRole?: "target" | "tool";
	/** Drawn this far from where the piece really is (the join preview pulls tools clear). */
	displayOffset?: Vec3;
};

/** Everything the shape depends on, so the (costly) cut is only redone when one of these changes. */
const shapeKey = (piece: Piece, cutters: Piece[]) =>
	JSON.stringify(
		[piece, ...cutters].map((p) => [pieceSize(p), p.position, p.rotation]),
	);

/** The box, with any joints cut out of it, and the lines outlining it. Disposed when replaced. */
function usePieceGeometry(
	piece: Piece,
	cutters: Piece[],
): { geometry: BufferGeometry; edges: number[] } {
	const key = cutters.length ? shapeKey(piece, cutters) : "";
	const size = pieceSize(piece);
	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for piece and cutters.
	const shape = useMemo(() => {
		const geometry = cutters.length
			? cutGeometry(piece, cutters)
			: new BoxGeometry(size.x, size.y, size.z);
		return { geometry, edges: featureEdges(geometry) };
	}, [key, size.x, size.y, size.z]);
	useEffect(() => () => shape.geometry.dispose(), [shape]);
	return shape;
}

/**
 * True if a hit lies on the box's own face, not on a surface inside a cut (whose normal would
 * otherwise be mistaken for the outside face pointing the same way).
 */
function onOuterFace(hit: Intersection, face: FaceRef, size: Vec3): boolean {
	const local = hit.object.worldToLocal(hit.point.clone());
	return (
		Math.abs(Math.abs(local[face.axis]) - size[face.axis] / 2) <
		SURFACE_TOLERANCE
	);
}

/**
 * Draws one piece as a box. Click selects the face under the cursor (or the whole piece, if that
 * face can't be extruded); double-click selects the piece. Shift adds to / removes from the selection.
 */
export function PieceMesh({
	piece,
	selected,
	hovered = false,
	ghost,
	cutters,
	joinRole,
	displayOffset,
}: Props) {
	const size = pieceSize(piece);
	const { geometry, edges } = usePieceGeometry(piece, cutters);
	const viewport = useThree((st) => st.size);
	const { position: p, rotation: r } = piece;
	const see = ghost || joinRole === "tool";

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
		const outside = onOuterFace(hit, face, size);
		// Measure tool: the click picks the edge of this face nearest the pointer; nothing gets selected.
		if (useAppStore.getState().tool === "measure") {
			if (outside)
				measureClick(pickEdge(piece, face, e.camera, e.pointer, viewport));
			return;
		}
		const shift = e.nativeEvent.shiftKey;
		// Alt+click works inside a group: just this piece (or its face), not the whole group.
		const single = e.nativeEvent.altKey;
		const { doc } = useAppStore.getState();
		const selectObject = () =>
			applyCommand(
				single
					? shift
						? commands.togglePiece(piece.id)
						: commands.selectPieces([piece.id])
					: shift
						? commands.toggleObject(piece.id)
						: commands.selectObjects([piece.id]),
			);
		// Shift+click while pieces are selected adds/removes this whole piece (multi-select to move/rotate).
		// A face that can't be extruded (sheet top, rail side), a surface inside a cut, or a piece in a
		// group selects the whole object.
		if (
			(shift && doc.selection.length > 0) ||
			!outside ||
			!extrudableDimension(piece, face) ||
			(!single && groupOf(doc.groups, piece.id))
		) {
			selectObject();
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
		setMeasureHover(
			onOuterFace(hit, face, size)
				? pickEdge(piece, face, e.camera, e.pointer, viewport)
				: null,
		);
	};

	// Only the nearest piece lights up: stopping here keeps the event from pieces behind it.
	const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
		if (ghost || joinRole) return;
		e.stopPropagation();
		useAppStore.getState().setHovered(piece.id);
	};

	const onPointerOut = () => {
		const { measureHover, setMeasureHover, hovered, setHovered } =
			useAppStore.getState();
		if (measureHover?.pieceId === piece.id) setMeasureHover(null);
		if (hovered === piece.id) setHovered(null);
	};

	// Pressing on a selected piece and dragging moves it across the plane of the grabbed face.
	const startPlaneDrag = usePlaneDrag();
	const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
		if (ghost || joinRole) return;
		if (e.intersections.some((i) => isGizmoObject(i.object))) return;
		// Right button: a menu if it's released without dragging (a drag orbits the camera).
		if (e.button === 2) {
			e.stopPropagation();
			armContextMenu(piece.id, e.nativeEvent);
			return;
		}
		const hit = e.intersections.find((i) => i.object === e.eventObject);
		if (!hit?.face) return;
		const n = hit.face.normal;
		startPlaneDrag(e, piece.id, rotateVector({ x: n.x, y: n.y, z: n.z }, r));
	};

	const onDoubleClick = (e: ThreeEvent<MouseEvent>) => {
		e.stopPropagation();
		// With Shift, the two clicks before this already toggled the piece in and out; toggle it back.
		if (ghost || useAppStore.getState().tool === "measure") return;
		const single = e.nativeEvent.altKey;
		applyCommand(
			e.nativeEvent.shiftKey
				? single
					? commands.togglePiece(piece.id)
					: commands.toggleObject(piece.id)
				: single
					? commands.selectPieces([piece.id])
					: commands.selectObjects([piece.id]),
		);
	};

	const o = displayOffset ?? { x: 0, y: 0, z: 0 };
	return (
		<mesh
			geometry={geometry}
			position={[p.x + o.x, p.y + o.y, p.z + o.z]}
			rotation={[r.x * DEG, r.y * DEG, r.z * DEG]}
			onClick={onClick}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerOver={onPointerOver}
			onPointerOut={onPointerOut}
			onDoubleClick={onDoubleClick}
		>
			<meshStandardMaterial
				color={
					joinRole === "target"
						? JOIN_TARGET_COLORS[piece.kind]
						: joinRole
							? COLORS[piece.kind]
							: hovered
								? selected
									? HOVER_SELECTED_COLORS[piece.kind]
									: HOVER_COLORS[piece.kind]
								: selected
									? SELECTED_COLORS[piece.kind]
									: COLORS[piece.kind]
				}
				transparent={see}
				opacity={joinRole === "tool" ? JOIN_TOOL_OPACITY : ghost ? 0.6 : 1}
				// So what's behind a see-through piece (e.g. the cut it would make) still draws.
				depthWrite={!see}
				// Pushed back so outlines always win over faces, including a neighbour's flush face.
				polygonOffset
				polygonOffsetFactor={1}
				polygonOffsetUnits={2}
			/>
			<Line
				segments
				points={edges}
				raycast={() => null}
				color={
					joinRole === "target"
						? JOIN_TARGET_EDGE
						: joinRole === "tool"
							? "#8a7a64"
							: selected
								? SELECTED_EDGE
								: hovered
									? HOVER_EDGE
									: "#5c4a32"
				}
				lineWidth={
					joinRole === "target"
						? 2.5
						: selected && !joinRole
							? 2.5
							: hovered && !joinRole
								? 2
								: 1
				}
			/>
		</mesh>
	);
}
