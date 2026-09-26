import { type EdgeRef, sameEdge } from "@/geometry/box";
import { newId } from "@/model/createPiece";
import type { Id } from "@/model/types";
import type { Command } from "@/state/document";

/** Adds a dimension between two edges' midpoints. Measuring an edge against itself is ignored. */
export const addMeasurement =
	(from: EdgeRef, to: EdgeRef): Command =>
	(doc) => {
		if (
			sameEdge(from, to) ||
			!doc.pieces[from.pieceId] ||
			!doc.pieces[to.pieceId]
		)
			return doc;
		const id = newId();
		return {
			...doc,
			measurements: { ...doc.measurements, [id]: { id, from, to, at: 0.5 } },
		};
	};

/** Slides a measurement along its edges (`at`: 0 to 1 along the first edge). */
export const moveMeasurement =
	(id: Id, at: number): Command =>
	(doc) => {
		const m = doc.measurements[id];
		if (!m || m.at === at) return doc;
		return {
			...doc,
			measurements: { ...doc.measurements, [id]: { ...m, at } },
		};
	};

export const removeMeasurement =
	(id: Id): Command =>
	(doc) => {
		if (!doc.measurements[id]) return doc;
		const measurements = { ...doc.measurements };
		delete measurements[id];
		return { ...doc, measurements };
	};
