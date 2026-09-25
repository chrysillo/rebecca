import { piecesOverlap } from "@/geometry/overlap";
import { newId } from "@/model/createPiece";
import type { Joint } from "@/model/joint";
import type { Id } from "@/model/types";
import type { Command } from "@/state/document";

/**
 * Cuts each tool that overlaps `target` out of it. A pair already joined the other way round is
 * flipped (so choosing again changes which piece is cut); one already joined this way is left alone.
 */
export const joinInto =
	(target: Id, tools: Id[]): Command =>
	(doc) => {
		const piece = doc.pieces[target];
		if (!piece) return doc;
		const joints = { ...doc.joints };
		let changed = false;
		for (const toolId of tools) {
			const tool = doc.pieces[toolId];
			if (!tool || toolId === target) continue;
			const existing = Object.values(joints).find(
				(j) =>
					(j.target === target && j.tool === toolId) ||
					(j.target === toolId && j.tool === target),
			);
			if (existing?.target === target) continue;
			if (!existing && !piecesOverlap(piece, tool)) continue;
			const joint: Joint = {
				id: existing?.id ?? newId(),
				target,
				tool: toolId,
			};
			joints[joint.id] = joint;
			changed = true;
		}
		return changed ? { ...doc, joints } : doc;
	};

export const removeJoint =
	(id: Id): Command =>
	(doc) => {
		if (!doc.joints[id]) return doc;
		const joints = { ...doc.joints };
		delete joints[id];
		return { ...doc, joints };
	};

/** Swaps which piece of a joint is cut. */
export const flipJoint =
	(id: Id): Command =>
	(doc) => {
		const j = doc.joints[id];
		if (!j) return doc;
		return {
			...doc,
			joints: { ...doc.joints, [id]: { id, target: j.tool, tool: j.target } },
		};
	};
