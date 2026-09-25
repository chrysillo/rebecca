import { useMemo } from "react";
import { PieceMesh } from "@/scene/PieceMesh";
import { displayPieces } from "@/state/selectors";
import { useAppStore } from "@/state/store";

/** Renders every piece in the document, with any drag or extrude preview applied. */
export function Pieces() {
	const doc = useAppStore((s) => s.doc);
	const drag = useAppStore((s) => s.drag);
	const extrude = useAppStore((s) => s.extrude);
	const items = useMemo(
		() => displayPieces(doc, drag, extrude),
		[doc, drag, extrude],
	);

	return items.map((item) => <PieceMesh key={item.piece.id} {...item} />);
}
