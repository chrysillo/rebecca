import { useMemo } from "react";
import type { Aabb } from "@/geometry/box";
import { overlapBox } from "@/geometry/overlap";
import { PieceMesh } from "@/scene/pieces/PieceMesh";
import { type DisplayPiece, displayPieces } from "@/state/selectors";
import { useAppStore } from "@/state/store";
import { joinPreview, toolsFor } from "@/tools/joinSession";

type Item = DisplayPiece & {
	/** Join preview: where a cutting piece overlaps the piece being cut, left unhatched. */
	hatchExclude?: Aabb | null;
};

/** Renders every piece in the document, with any drag, extrude or join preview applied. */
export function Pieces() {
	const doc = useAppStore((s) => s.doc);
	const drag = useAppStore((s) => s.drag);
	const extrude = useAppStore((s) => s.extrude);
	const joiner = useAppStore((s) => s.joiner);
	const exporting = useAppStore((s) => s.exporting);
	// The piece a right-click menu is open for stays lit; otherwise the one under the pointer.
	const highlighted = useAppStore((s) => s.contextMenu?.pieceId ?? s.hovered);
	const items = useMemo((): Item[] => {
		const shown = displayPieces(joinPreview(doc, joiner), drag, extrude);
		if (!joiner) return shown;
		// While choosing: nothing moves. The piece to be cut shows amber with its cut. Each piece
		// cutting it is hidden (nearly see-through, faintly hatched) and its part inside the cut
		// is left out entirely, so the cut itself is plain empty space.
		const target = doc.pieces[joiner.highlighted];
		const tools = new Set(toolsFor(doc, joiner.highlighted));
		return shown.map((d) => {
			if (d.piece.id === joiner.highlighted)
				return { ...d, joinRole: "target" as const };
			if (!tools.has(d.piece.id)) return d;
			return {
				...d,
				joinRole: "tool" as const,
				cutters: [...d.cutters, target],
				hatchExclude: overlapBox(target, d.piece),
			};
		});
	}, [doc, drag, extrude, joiner]);

	return items.map((item) => (
		<PieceMesh
			key={item.piece.id}
			{...item}
			selected={item.selected && !exporting}
			hovered={item.piece.id === highlighted && !exporting && !drag}
		/>
	));
}
