import { useMemo } from "react";
import { pullApart } from "@/geometry/overlap";
import { scale } from "@/geometry/vec";
import { PieceMesh } from "@/scene/pieces/PieceMesh";
import { displayPieces } from "@/state/selectors";
import { useAppStore } from "@/state/store";
import { joinPreview, toolsFor } from "@/tools/joinSession";

/** Join preview: how far (mm) past the point of no overlap a tool is pulled away, to show the cut. */
const PULL_CLEARANCE = 60;

/** Renders every piece in the document, with any drag, extrude or join preview applied. */
export function Pieces() {
	const doc = useAppStore((s) => s.doc);
	const drag = useAppStore((s) => s.drag);
	const extrude = useAppStore((s) => s.extrude);
	const joiner = useAppStore((s) => s.joiner);
	const exporting = useAppStore((s) => s.exporting);
	// The piece a right-click menu is open for stays lit; otherwise the one under the pointer.
	const highlighted = useAppStore((s) => s.contextMenu?.pieceId ?? s.hovered);
	const items = useMemo(() => {
		const shown = displayPieces(joinPreview(doc, joiner), drag, extrude);
		if (!joiner) return shown;
		// While choosing: the piece to be cut stays put (amber, with its cut), and each piece
		// cutting it is pulled clear, so you see exactly what's removed and from which piece.
		const target = doc.pieces[joiner.highlighted];
		const tools = new Set(toolsFor(doc, joiner.highlighted));
		return shown.map((d) => {
			if (d.piece.id === joiner.highlighted)
				return { ...d, joinRole: "target" as const };
			if (!tools.has(d.piece.id)) return d;
			const { axis, depth } = pullApart(target, d.piece);
			return {
				...d,
				joinRole: "tool" as const,
				displayOffset: scale(axis, depth + PULL_CLEARANCE),
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
