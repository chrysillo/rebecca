import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { commands } from "@/commands";
import { type EdgeRef, edgeEnds, piecesAabb } from "@/geometry/box";
import {
	DIMENSION_OFFSET,
	measureEdges,
	stackDimensions,
} from "@/geometry/measure";
import type { Id, Piece } from "@/model/types";
import { DimensionLine } from "@/scene/DimensionLine";
import { applyCommand, useAppStore } from "@/state/store";

const MEASURE_COLOR = "#0f766e";
const HOVER_COLOR = "#f59e0b";

/**
 * Saved measurements (recomputed from the pieces every render, so they follow moves and resizes),
 * plus the Measure tool's feedback: the edge under the pointer, the edge the next measurement
 * starts from, and a live dimension between them.
 */
export function Measurements() {
	const measurements = useAppStore((s) => s.doc.measurements);
	const pieces = useAppStore((s) => s.doc.pieces);
	const start = useAppStore((s) => s.measureStart);
	const hover = useAppStore((s) => s.measureHover);

	const saved = useMemo(
		() =>
			Object.values(measurements).flatMap((m) => {
				const dimension = measureEdges(pieces, m.from, m.to);
				return dimension
					? [{ id: m.id, dimension, awayFrom: piecesCentre(pieces, m) }]
					: [];
			}),
		[measurements, pieces],
	);
	const levels = useMemo(() => stackDimensions(saved), [saved]);
	const preview = start && hover ? measureEdges(pieces, start, hover) : null;

	return (
		<>
			{saved.map(({ id, dimension, awayFrom }, i) => (
				<DimensionLine
					key={id}
					dimension={dimension}
					awayFrom={awayFrom}
					offset={DIMENSION_OFFSET * (1 + levels[i])}
					color={MEASURE_COLOR}
					onRemove={() => applyCommand(commands.removeMeasurement(id))}
				/>
			))}
			{start && <EdgeLine pieces={pieces} edge={start} color={MEASURE_COLOR} />}
			{hover && <EdgeLine pieces={pieces} edge={hover} color={HOVER_COLOR} />}
			{preview && preview.distance > 0 && start && hover && (
				<DimensionLine
					dimension={preview}
					color={HOVER_COLOR}
					awayFrom={piecesCentre(pieces, { from: start, to: hover })}
				/>
			)}
		</>
	);
}

/** A thick line drawn over one edge, on top of everything. */
function EdgeLine({
	pieces,
	edge,
	color,
}: {
	pieces: Record<Id, Piece>;
	edge: EdgeRef;
	color: string;
}) {
	const piece = pieces[edge.pieceId];
	if (!piece) return null;
	const [a, b] = edgeEnds(piece, edge);
	return (
		<Line
			points={[
				[a.x, a.y, a.z],
				[b.x, b.y, b.z],
			]}
			color={color}
			lineWidth={4}
			depthTest={false}
			transparent
			renderOrder={950}
		/>
	);
}

/** Centre of the box around the measured piece(s), so dimensions sit outside them. */
function piecesCentre(
	pieces: Record<Id, Piece>,
	m: { from: EdgeRef; to: EdgeRef },
) {
	const list = [pieces[m.from.pieceId], pieces[m.to.pieceId]].filter(Boolean);
	const { min, max } = piecesAabb(list);
	return {
		x: (min.x + max.x) / 2,
		y: (min.y + max.y) / 2,
		z: (min.z + max.z) / 2,
	};
}
