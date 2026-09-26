import { Line } from "@react-three/drei";
import { type ThreeEvent, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { BoxGeometry, type BufferGeometry, type Intersection } from "three";
import { stockColor, WOOD_COLOR } from "@/colors";
import { commands } from "@/commands";
import {
	type Aabb,
	type FaceRef,
	faceFromLocalNormal,
	rotateVector,
} from "@/geometry/box";
import { setBoxUvs } from "@/geometry/boxUv";
import { cutGeometry } from "@/geometry/cut";
import { featureEdges } from "@/geometry/edges";
import { extrudableDimension } from "@/geometry/extrude";
import { boxHatch, clipOutside } from "@/geometry/hatch";
import { DEG, type Vec3 } from "@/geometry/vec";
import { pieceSize } from "@/model/dimensions";
import { groupOf } from "@/model/group";
import type { Id, Piece } from "@/model/types";
import { materialTexture } from "@/scene/pieces/materialTexture";
import { pickEdge } from "@/scene/pieces/pickEdge";
import { pieceLook } from "@/scene/pieces/pieceLook";
import { usePlaneDrag } from "@/scene/pieces/usePlaneDrag";
import { isGizmoObject } from "@/scene/shared/gizmoStyle";
import { applyCommand, useAppStore } from "@/state/store";
import { armContextMenu } from "@/tools/contextMenuSession";
import { measureClick } from "@/tools/measureSession";

/** Max pointer travel (px) between press and release for it to count as a click. */
const CLICK_SLOP = 3;

/** Hatching on a join tool: spacing (mm), widened on big pieces so they don't fill up with lines. */
const HATCH_SPACING = 12;
const MAX_HATCH_LINES = 40;
const HATCH_OPACITY = 0.35;

/** How many mm one repeat of a sheet's material pattern covers. */
const TEXTURE_TILE_MM = 400;

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
	/** Join preview: where this tool overlaps the piece being cut (local frame), left unhatched. */
	hatchExclude?: Aabb | null;
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
		setBoxUvs(geometry, TEXTURE_TILE_MM);
		return { geometry, edges: featureEdges(geometry) };
	}, [key, size.x, size.y, size.z]);
	useEffect(() => () => shape.geometry.dispose(), [shape]);
	return shape;
}

/**
 * Selects (or with `toggle`, adds/removes) a piece. Normally that means its whole group; with
 * `single` (Alt) just the piece itself.
 */
const selectPiece = (
	id: Id,
	{ toggle, single }: { toggle: boolean; single: boolean },
) =>
	single
		? toggle
			? commands.togglePiece(id)
			: commands.selectPieces([id])
		: toggle
			? commands.toggleObject(id)
			: commands.selectObjects([id]);

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
	hatchExclude,
}: Props) {
	const size = pieceSize(piece);
	const { geometry, edges } = usePieceGeometry(piece, cutters);
	const viewport = useThree((st) => st.size);
	const { position: p, rotation: r } = piece;
	const stock = useAppStore((s) => s.doc.stock[piece.stockId]);
	const base = stock ? stockColor(stock) : WOOD_COLOR[piece.kind];
	const map = stock ? materialTexture(stock) : null;
	const look = pieceLook(base, { selected, hovered, ghost, joinRole });
	// biome-ignore lint/correctness/useExhaustiveDependencies: the size's numbers stand for `size`.
	const hatch = useMemo(() => {
		if (!look.hatched) return null;
		const longest = Math.max(size.x, size.y, size.z);
		const lines = boxHatch(
			size,
			Math.max(HATCH_SPACING, longest / MAX_HATCH_LINES),
		);
		return hatchExclude ? clipOutside(lines, hatchExclude) : lines;
	}, [look.hatched, hatchExclude, size.x, size.y, size.z]);

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
			applyCommand(selectPiece(piece.id, { toggle: shift, single }));
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
		applyCommand(
			selectPiece(piece.id, {
				toggle: e.nativeEvent.shiftKey,
				single: e.nativeEvent.altKey,
			}),
		);
	};

	return (
		<mesh
			geometry={geometry}
			position={[p.x, p.y, p.z]}
			rotation={[r.x * DEG, r.y * DEG, r.z * DEG]}
			onClick={onClick}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerOver={onPointerOver}
			onPointerOut={onPointerOut}
			onDoubleClick={onDoubleClick}
		>
			<meshStandardMaterial
				// three only picks up a change to `transparent` or `map` on a new material, so swap it.
				key={`${look.seeThrough ? "see-through" : "solid"}-${map ? "mapped" : "plain"}`}
				color={look.fill}
				map={map}
				transparent={look.seeThrough}
				opacity={look.opacity}
				// So what's behind a see-through piece (e.g. the cut it would make) still draws.
				depthWrite={!look.seeThrough}
				// Pushed back so outlines always win over faces, including a neighbour's flush face.
				polygonOffset
				polygonOffsetFactor={1}
				polygonOffsetUnits={2}
			/>
			<Line
				segments
				points={edges}
				raycast={() => null}
				color={look.edge}
				lineWidth={look.edgeWidth}
			/>
			{hatch && hatch.length > 0 && (
				<Line
					segments
					points={hatch}
					raycast={() => null}
					color={look.edge}
					lineWidth={1}
					transparent
					opacity={HATCH_OPACITY}
				/>
			)}
		</mesh>
	);
}
