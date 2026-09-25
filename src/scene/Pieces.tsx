import { useMemo } from "react";
import { displayPieces } from "../state/selectors";
import { useAppStore } from "../state/store";
import { PieceMesh } from "./PieceMesh";

/** Renders every piece in the document, with any drag preview applied. */
export function Pieces() {
	const doc = useAppStore((s) => s.doc);
	const drag = useAppStore((s) => s.drag);
	const items = useMemo(() => displayPieces(doc, drag), [doc, drag]);

	return items.map((item) => <PieceMesh key={item.piece.id} {...item} />);
}
