import { useMemo } from "react";
import { axisGaps } from "@/geometry/measure";
import { DimensionLine } from "@/scene/annotations/DimensionLine";
import { useAppStore } from "@/state/store";

const GAP_COLOR = "#c2410c";

/**
 * While a piece is dragged along an arrow: the gap ahead and behind along that axis to the
 * nearest piece (or the floor), updating as it moves. Disappears when the drag ends.
 */
export function LiveGaps() {
	const drag = useAppStore((s) => s.drag);
	const pieces = useAppStore((s) => s.doc.pieces);

	const gaps = useMemo(() => {
		if (!drag?.moveAxis) return [];
		const ids = Object.keys(drag.preview);
		const moving = ids.flatMap((id) =>
			pieces[id] ? [{ ...pieces[id], ...drag.preview[id] }] : [],
		);
		// When duplicating, the originals stay put and are valid neighbours to measure against.
		const others = Object.values(pieces).filter(
			(p) => drag.duplicate || !ids.includes(p.id),
		);
		return axisGaps(moving, others, drag.moveAxis);
	}, [drag, pieces]);

	return gaps.map((dimension, i) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: at most one gap ahead and one behind
		<DimensionLine key={i} dimension={dimension} color={GAP_COLOR} />
	));
}
