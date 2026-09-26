import { useAppStore } from "@/state/store";

/** The selection box being dragged in the 3D view. */
export function BoxSelectRect() {
	const box = useAppStore((s) => s.boxSelect);
	if (!box) return null;
	const { start, end } = box;
	return (
		<div
			className="pointer-events-none fixed z-30 border border-sky-600 bg-sky-500/10"
			style={{
				left: Math.min(start.x, end.x),
				top: Math.min(start.y, end.y),
				width: Math.abs(end.x - start.x),
				height: Math.abs(end.y - start.y),
			}}
		/>
	);
}
