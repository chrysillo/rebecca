import { commands } from "../commands";
import type { Id, Transform } from "../model/types";
import { useAppStore } from "../state/store";

/** Ends a gizmo drag: one undoable command, or nothing if the pieces didn't change. */
export function commitDrag() {
	const { drag, doc, apply, setDrag } = useAppStore.getState();
	setDrag(null);
	if (!drag || !hasChanged(drag.preview, doc.pieces)) return;
	apply(
		drag.duplicate
			? commands.duplicatePiecesTo(drag.preview)
			: commands.setTransforms(drag.preview),
	);
}

function hasChanged(
	preview: Record<Id, Transform>,
	pieces: Record<Id, Transform>,
): boolean {
	return Object.entries(preview).some(([id, t]) => {
		const p = pieces[id];
		return (
			p && (!same(p.position, t.position) || !same(p.rotation, t.rotation))
		);
	});
}

const same = (a: Transform["position"], b: Transform["position"]) =>
	a.x === b.x && a.y === b.y && a.z === b.z;
